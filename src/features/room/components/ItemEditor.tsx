import { useEffect, useState } from 'react';
import type { Item } from '../../../shared/types/api';

/** 옵션(항목) 최대 개수 — 룰렛·슬롯·풍선·투표 공통 상한(서버 game.service 와 동일) */
const MAX_ITEMS = 12;

/**
 * 항목 개수·목록 편집 — 별도 페이지가 아니라 각 게임 화면 위에 그대로 얹혀서 쓰인다.
 * 항목이 하나도 없으면 입력칸 1개로 시작하고("항목이 하나인 상황"), 텍스트를 적고
 * Enter/"+"를 누르면 그 자리에서 서버에 반영(item:add)되며 다음 빈 칸이 이어서 나타난다
 * — 이게 "+ 버튼으로 항목개수를 늘리는" 동작이다. 이미 있는 항목은 ×로 즉시 삭제(item:remove).
 * 한 번에 하나씩만 커밋되므로(사람이 타이핑하는 속도로 자연히 간격이 생김) 서버의
 * read-modify-write 항목 저장 로직이 겹쳐 실행되는 문제가 없다.
 * locked=true 면(게임이 실제로 시작됨) 렌더하지 않는다.
 */
export function ItemEditor({
  items,
  onAdd,
  onRemove,
  locked,
  onDraftChange,
}: {
  items: Item[];
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
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

  const commit = () => {
    const label = draft.trim();
    if (!label || atMax) return;
    onAdd(label);
    onDraftChange?.(''); // 커밋되면 '입력 중' 미리보기를 즉시 지운다(항목은 item:add 로 공유됨)
    setDraft('');
  };

  return (
    <div className="item-editor">
      <p className="section-label">
        항목 {items.length}개
        {items.length < 2 && ' · 최소 2개 필요'}
        {atMax && ` · 최대 ${MAX_ITEMS}개`}
      </p>
      <div className="stack-sm" style={{ marginTop: 8 }}>
        {items.map((it) => (
          <div key={it.id} className="list-row">
            <span>{it.label}</span>
            <button
              className="row-remove"
              onClick={() => onRemove(it.id)}
              aria-label={`${it.label} 삭제`}
            >
              ✕
            </button>
          </div>
        ))}
        {!atMax && (
          <div className="list-row">
            <input
              className="input"
              style={{ border: 'none', background: 'transparent', padding: 0, flex: 1 }}
              placeholder={`항목 ${items.length + 1} 입력`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  commit();
                }
              }}
            />
            <button
              className="row-remove"
              style={{ color: 'var(--accent)', fontWeight: 700 }}
              onClick={commit}
              disabled={!draft.trim()}
              aria-label="항목 추가"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
