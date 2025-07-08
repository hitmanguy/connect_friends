import Image from 'next/image';
import svgUrl from '@/assets/vg.svg'; // Import as URL

export default function FigmaBackground() {
  return (
    <div className="fixed inset-0">
      <Image src={svgUrl} alt="Background" fill priority className="object-cover" />
    </div>
  );
}