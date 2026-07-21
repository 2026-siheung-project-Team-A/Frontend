import { useState } from 'react';
import type { Item, VoteTallyEntry } from '../../../shared/types/api';
import { Screen, Button, TopBar } from '../../../shared/ui';
import { ItemEditor } from '../../room/components/ItemEditor';

/**
 * ⑫ 투표하기 — 참가자가 하나 골라 투표(vote:cast), 실시간 집계 막대.
 *  참가자: 항목 선택 → "투표하기" → onVote(itemId). 다시 눌러 변경 가능.
 *  호스트: 투표는 안 하고 실시간 집계를 보며 "투표 마감"(onClose) → 결과.
 * 집계(tally)는 vote:updated 로 실시간 갱신된다.
 */
export function VotePlay({
  roomId,
  items,
  tally,
  isHost,
  myVote,
  onVote,
  onClose,
  onLeave,
  onAddItem,
  onRemoveItem,
}: {
  roomId: string;
  items: Item[];
  tally: VoteTallyEntry[];
  isHost: boolean;
  myVote?: string | null;
  onVote?: (itemId: string) => void;
  onClose?: () => void;
  onLeave?: () => void;
  /** 호스트 전용 — 투표는 진행 중에도 항목을 계속 추가/삭제할 수 있다(명시적 시작 단계가 없어서). */
  onAddItem?: (label: string) => void;
  onRemoveItem?: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(myVote ?? null);

  const countById = new Map(tally.map((t) => [t.item.id, t.count]));
  const total = tally.reduce((s, t) => s + t.count, 0);

  return (
    <Screen
      footer={
        isHost ? (
          <Button block onClick={onClose}>
            투표 마감
          </Button>
        ) : (
          <Button block onClick={() => selected && onVote?.(selected)} disabled={!selected}>
            {myVote ? '투표 변경' : '투표하기'}
          </Button>
        )
      }
    >
      <TopBar title="투표하기" onBack={onLeave} trailing={<span className="chip">#{roomId}</span>} />
      <p className="subtitle" style={{ marginTop: -8 }}>
        {isHost ? '실시간 집계 · 준비되면 마감하세요' : '하나 골라 투표하세요 (실시간 집계)'}
      </p>

      {isHost && onAddItem && onRemoveItem && (
        <ItemEditor items={items} onAdd={onAddItem} onRemove={onRemoveItem} />
      )}

      <div className="stack-sm" style={{ marginTop: 20 }}>
        {items.map((it) => {
          const count = countById.get(it.id) ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isMine = myVote === it.id;
          const isSel = selected === it.id;
          return (
            <button
              key={it.id}
              className={`vote-row${isSel ? ' selected' : ''}`}
              onClick={() => !isHost && setSelected(it.id)}
              disabled={isHost}
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
        총 {total}표 · 실시간 갱신
      </p>
    </Screen>
  );
}
