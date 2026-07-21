import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'accent';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** 가로 꽉 채움 (하단 고정 액션 기본값) */
  block?: boolean;
}

/**
 * 공통 버튼. 기본은 차콜 프라이머리·가로 꽉.
 * 하단 고정 액션은 <Button block>, 보조 액션은 variant="secondary".
 */
export function Button({
  variant = 'primary',
  block = true,
  className = '',
  ...rest
}: ButtonProps) {
  const cls = [
    'btn',
    `btn-${variant}`,
    block ? 'btn-block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <button className={cls} {...rest} />;
}
