import LeggTilVin from '@/components/LeggTilVin';

export default function LeggTilVinSide() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="font-display text-5xl text-wine-900 mb-3">Legg til en vin</h1>
        <div className="gold-line w-24 mx-auto mb-4" />
        <p className="text-ink-700/70 italic">
          Du kan legge til viner uavhengig av klubbkvelder.
        </p>
      </div>
      <LeggTilVin redirectEtterLagring="/viner/:id" />
    </div>
  );
}