import Image from 'next/image';

interface HarlaniLogoProps {
  /** 'full': tamanho maior (tela de login). 'compact': menor (header da sidebar). */
  readonly variant?: 'full' | 'compact';
}

// Dimensões intrínsecas reais de public/logo-harlani.png
const LOGO_INTRINSIC_WIDTH = 624;
const LOGO_INTRINSIC_HEIGHT = 318;

export function HarlaniLogo({ variant = 'full' }: HarlaniLogoProps) {
  const displayWidth = variant === 'full' ? 260 : 168;

  return (
    <Image
      src="/logo-harlani.png"
      alt="Harlani Gomes — Gestão Financeira e Empresarial"
      width={LOGO_INTRINSIC_WIDTH}
      height={LOGO_INTRINSIC_HEIGHT}
      style={{ width: displayWidth, height: 'auto' }}
      priority
    />
  );
}
