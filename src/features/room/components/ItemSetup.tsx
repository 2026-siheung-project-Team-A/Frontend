import { useState } from 'react';
import type { Item } from '../../../shared/types/api';
import { Screen, Button, TopBar } from '../../../shared/ui';

/**
 * ③ 항목 입력 (공통) — 뽑을/투표할 항목을 넣는다.
 * 방은 이미 만들어진 상태(홈에서 POST /rooms 완료)라
 * 항목 추가/삭제는 소켓(item:add/item:remove)으로 실시간 반영한다.
 * 최소 2개가 있어야 다음(QR 공유)으로 진행.
 */
export function ItemSetup({
  items,
  onAdd,
  onRemove,
  onNext,
  onBack,
}: {
  items: Item[];
  onAdd: (label: string) => void;
  onRemove: (itemId: string) => void;
  onNext: () => void;
  onBack?: () => void;
}) {
  const [label, setLabel] = useState('');

  const add = () => {
    const v = label.trim();
    if (!v) return;
    onAdd(v);
    setLabel('');
  };

  return (
    <Screen
      footer={
        <Button block onClick={onNext} disabled={items.length < 2}>
          다음 · QR 공유
        </Button>
      }
    >
      <TopBar title="항목 입력" onBack={onBack} />
      <p className="subtitle" style={{ marginTop: -8 }}>
        뽑을/투표할 항목을 넣어주세요
      </p>

      <div className="stack-sm" style={{ marginTop: 20 }}>
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
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <input
          className="input"
          placeholder="항목 입력"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <Button variant="secondary" block={false} onClick={add} style={{ flexShrink: 0 }}>
          + 추가
        </Button>
      </div>

      {items.length < 2 && (
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          최소 2개가 필요해요
        </p>
      )}
    </Screen>
  );
}
