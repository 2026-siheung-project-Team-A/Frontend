import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Item, VoteStatus, VoteTallyEntry } from '../../../shared/types/api';
import { Screen, Button, TopBar } from '../../../shared/ui';
import { ItemEditor } from '../../room/components/ItemEditor';

/**
 * ⑫ 투표하기 — 라이프사이클: preparing → open → closing(10초) → closed.
 *  preparing : 호스트가 항목을 추가하는 단계 — 아무도 투표 못 함(참가자는 목록만 실시간으로 본다).
 *  open      : 호스트가 '투표 시작'을 누른 뒤 — 참가자·호스트가 투표.
 *  closing   : 호스트가 '투표 마감'을 누른 뒤 10초 카운트다운(취소·재마감 가능, 그동안 투표는 계속).
 *  closed    : 카운트다운 종료 → 결과.
 * 상태·카운트다운(closeAt)은 서버가 전원에게 broadcast(vote:state) 하므로 모두 같은 화면을 본다.
 */

/** closeAt(epoch ms)까지 남은 초 — 올림해서 사람이 보기 좋게. */
const secondsUntil = (closeAt: number | null): number =>
  closeAt == null ? 0 : Math.max(0, Math.ceil((closeAt - Date.now()) / 1000));

export function VotePlay({
  items,
  tally,
  isHost,
  myVote,
  voteStatus,
  voteCloseAt,
  onVote,
  onStart,
  onClose,
  onCancelClose,
  onFinalize,
  onLeave,
  onAddItem,
  onRemoveItem,
  onEditItem,
}: {
  roomId: string;
  items: Item[];
  tally: VoteTallyEntry[];
  isHost: boolean;
  myVote?: string | null;
  voteStatus: VoteStatus;
  voteCloseAt: number | null;
  onVote?: (itemId: string) => void;
  onStart?: () => void; // host — '투표 시작'(open)
  onClose?: () => void; // host — '투표 마감'(10초 카운트다운 시작)
  onCancelClose?: () => void; // host — 카운트다운 취소(다시 open)
  onFinalize?: () => void; // host — 카운트다운 0초에 실제 마감
  onLeave?: () => void;
  /** 호스트 전용 — 준비 단계에서 항목을 추가/삭제/수정한다. */
  onAddItem?: (label: string) => void;
  onRemoveItem?: (id: string) => void;
  onEditItem?: (id: string, label: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(myVote ?? null);
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(voteCloseAt));
  const finalizedRef = useRef(false);

  const countById = new Map(tally.map((t) => [t.item.id, t.count]));
  const total = tally.reduce((s, t) => s + t.count, 0);
  const canVote = voteStatus === 'open' || voteStatus === 'closing';
  const isClosing = voteStatus === 'closing';

  // 마감 카운트다운 — closing 동안 1초마다 갱신하고, 0이 되면 호스트가 실제 마감(vote:finalize)을 부른다.
  // voteCloseAt 이 바뀌면(재마감) 새 카운트다운으로 리셋된다. 참가자는 표시만, 마감 호출은 호스트만.
  useEffect(() => {
    if (voteStatus !== 'closing' || voteCloseAt == null) return;
    finalizedRef.current = false;
    const tick = () => {
      const left = secondsUntil(voteCloseAt);
      setSecondsLeft(left);
      if (left <= 0 && isHost && onFinalize && !finalizedRef.current) {
        finalizedRef.current = true;
        onFinalize();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [voteStatus, voteCloseAt, isHost, onFinalize]);

  const voteButton = (block: boolean) => (
    <Button
      block={block}
      variant={isHost ? 'secondary' : undefined}
      onClick={() => selected && canVote && onVote?.(selected)}
      disabled={!selected || !canVote}
    >
      {myVote ? '투표 변경' : '투표하기'}
    </Button>
  );

  // ── 하단 버튼 ── (상태·역할별)
  let footer: ReactNode;
  if (voteStatus === 'preparing') {
    footer = isHost ? (
      <Button block onClick={onStart} disabled={items.length < 2}>
        투표 시작
      </Button>
    ) : undefined;
  } else if (voteStatus === 'closed') {
    footer = undefined; // 결과 모달로 전환
  } else if (!isHost) {
    footer = voteButton(true);
  } else {
    // host · open|closing
    footer = (
      <div className="grid-2">
        {voteButton(false)}
        {isClosing ? (
          <Button variant="secondary" onClick={onCancelClose}>
            취소 ({secondsLeft})
          </Button>
        ) : (
          <Button onClick={onClose} disabled={total < 1}>
            투표 마감
          </Button>
        )}
      </div>
    );
  }

  const subtitle = isHost
    ? voteStatus === 'preparing'
      ? '항목을 추가하고 "투표 시작"을 누르세요'
      : isClosing
        ? '카운트다운이 끝나면 마감돼요 (취소할 수 있어요)'
        : '직접 투표하고, 1표 이상이면 마감할 수 있어요'
    : voteStatus === 'preparing'
      ? '호스트가 투표를 준비하고 있어요'
      : isClosing
        ? '곧 투표가 마감돼요'
        : '하나 골라 투표하세요 (실시간 집계)';

  return (
    <Screen footer={footer}>
      <TopBar title="투표하기" onBack={isHost ? onLeave : undefined} />
      <p className="subtitle" style={{ marginTop: -8 }}>{subtitle}</p>

      {/* 준비 단계: 호스트만 항목 편집(참가자는 목록만 실시간으로 본다) */}
      {isHost && voteStatus === 'preparing' && onAddItem && onRemoveItem && (
        <ItemEditor items={items} onAdd={onAddItem} onRemove={onRemoveItem} onEdit={onEditItem} />
      )}

      {/* 마감 카운트다운 — 전원에게 보인다 */}
      {isClosing && (
        <div className="vote-countdown" role="status" aria-live="polite">
          ⏱ <b>{secondsLeft}</b>초 후 투표가 마감돼요
        </div>
      )}

      {!isHost && items.length === 0 && voteStatus === 'preparing' ? (
        <p className="center muted" style={{ marginTop: 40 }}>
          호스트가 투표 항목을 준비하고 있어요…
        </p>
      ) : (
        <>
          <div className="stack-sm" style={{ marginTop: 20 }}>
            {items.map((it) => {
              const count = countById.get(it.id) ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const isMine = myVote === it.id;
              const isSel = selected === it.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  className={`vote-row${isSel ? ' selected' : ''}`}
                  disabled={!canVote}
                  onClick={() => canVote && setSelected(it.id)}
                >
                  <span className={`vote-radio${isSel || isMine ? ' on' : ''}`} />
                  <span className="vote-label">{it.label}</span>
                  <span className="vote-count">{count}</span>
                  <span className="vote-bar">
                    <span className="vote-bar-fill" style={{ width: `${pct}%` }} />
                  </span>
                </button>
              );
            })}
          </div>

          <p className="center muted" style={{ fontSize: 13, marginTop: 16 }}>
            {voteStatus === 'preparing'
              ? '투표 시작 전이에요'
              : `총 ${total}표 · 실시간 갱신`}
          </p>
        </>
      )}
    </Screen>
  );
}
