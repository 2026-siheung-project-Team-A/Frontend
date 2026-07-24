import { useEffect, useState } from 'react';
import type { Item } from '../../../shared/types/api';

/** 옵션(항목) 최대 개수 — 룰렛·슬롯·풍선·투표 공통 상한(서버 game.service 와 동일) */
const MAX_ITEMS = 12;

/**
 * 이미 추가한 항목 한 줄 — onEdit 이 있으면 label 을 그 자리에서 수정할 수 있는 입력칸으로 보여준다.
 * 값을 바꾸고 포커스가 빠지거나(blur) Enter 를 누르면 커밋(item:update). 빈 값이면 원래 값으로 되돌린다.
 * onEdit 이 없으면 읽기 전용 텍스트로 보여준다. 앞에는 순번 뱃지(1,2,3…)를 붙인다.
 */
function ItemRow({
  item,
  index,
  onEdit,
  onRemove,
}: {
  item: Item;
  index: number;
  onEdit?: (id: string, label: string) => void;
  onRemove: (id: string) => void;
}) {
  const [val, setVal] = useState(item.label);
  // 서버가 이 항목 라벨을 바꿔 다시 내려주면(다른 편집 등) 입력칸도 맞춘다.
  useEffect(() => {
    setVal(item.label);
  }, [item.label]);

  const commit = () => {
    const t = val.trim();
    if (!t) {
      setVal(item.label); // 빈 값이면 원복
      return;
    }
    if (t !== item.label) onEdit?.(item.id, t);
  };

  return (
    <li className="ie-row">
      <span className="ie-num" aria-hidden="true">{index + 1}</span>
      {onEdit ? (
        <input
          className="ie-row-input"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          aria-label={`${index + 1}번 항목 수정`}
        />
      ) : (
        <span className="ie-row-text">{item.label}</span>
      )}
      <button
        type="button"
        className="ie-del"
        onClick={() => onRemove(item.id)}
        aria-label={`${item.label} 삭제`}
      >
        ✕
      </button>
    </li>
  );
}

/**
 * 항목 목록 편집 — 별도 페이지가 아니라 각 게임 화면 위에 그대로 얹혀서 쓰인다(투표·순서 정하기 등).
 *
 * 상단에 눈에 띄는 '추가' 입력칸 + 채움 버튼을 두고, 그 아래 순번이 붙은 목록을 보여준다.
 * 텍스트를 적고 Enter 나 '추가'를 누르면 그 자리에서 서버에 반영(item:add)되고 입력칸이 비워진다.
 * 이미 있는 항목은 ✕ 로 즉시 삭제(item:remove)하고, onEdit 이 있으면 그 자리에서 내용 수정(item:update)한다.
 * 한 번에 하나씩만 커밋되므로 서버의 read-modify-write 저장이 겹치지 않는다.
 * locked=true 면(게임이 실제로 시작됨) 렌더하지 않는다.
 */
export function ItemEditor({
  items,
  onAdd,
  onRemove,
  onEdit,
  locked,
  onDraftChange,
}: {
  items: Item[];
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
  /** 있으면 이미 추가한 항목의 내용을 그 자리에서 수정할 수 있다(id 유지). */
  onEdit?: (id: string, label: string) => void;
  locked?: boolean;
  /** 입력 중인(아직 커밋 안 한) 항목 텍스트를 실시간으로 알린다(순서 정하기 참가자 미리보기용). */
  onDraftChange?: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');

  // 입력 중인 항목을 참가자에게 실시간 미리보기로 보낸다(디바운스 150ms). onDraftChange 없으면 무시.
  useEffect(() => {
    if (!onDraftChange) return;
    const t = setTimeout(() => onDraftChange(draft), 150);
    return () => clearTimeout(t);
  }, [draft, onDraftChange]);

  if (locked) return null;

  const atMax = items.length >= MAX_ITEMS;
  const needMore = items.length < 2;

  const commit = () => {
    const label = draft.trim();
    if (!label || atMax) return;
    onAdd(label);
    onDraftChange?.(''); // 커밋되면 '입력 중' 미리보기를 즉시 지운다(항목은 item:add 로 공유됨)
    setDraft('');
  };

  return (
    <div className="item-editor">
      <div className="ie-head">
        <span className="ie-title">항목 추가</span>
        <span className={`ie-count${needMore ? ' is-low' : ''}`}>
          {items.length} / {MAX_ITEMS}
        </span>
      </div>

      {/* 추가 입력 — 눈에 띄게 상단에. 적고 Enter 나 '추가'를 누르면 목록에 들어간다. */}
      {!atMax ? (
        <div className="ie-add">
          <input
            className="ie-add-input"
            placeholder="새 항목을 입력하세요"
            value={draft}
            maxLength={20}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                commit();
              }
            }}
            aria-label="새 항목 입력"
          />
          <button
            type="button"
            className="ie-add-btn"
            onClick={commit}
            disabled={!draft.trim()}
          >
            추가
          </button>
        </div>
      ) : (
        <p className="ie-hint">최대 {MAX_ITEMS}개까지 추가할 수 있어요</p>
      )}

      {/* 목록 */}
      {items.length === 0 ? (
        <p className="ie-empty">아직 항목이 없어요. 위에 입력해 2개 이상 추가해 주세요.</p>
      ) : (
        <ul className="ie-list">
          {items.map((it, i) => (
            <ItemRow
              key={it.id}
              item={it}
              index={i}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}

      {needMore && items.length > 0 && (
        <p className="ie-hint">시작하려면 최소 2개가 필요해요 (지금 {items.length}개)</p>
      )}
    </div>
  );
}
