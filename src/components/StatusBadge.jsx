export default function StatusBadge({ status, size = 'md' }) {
  const normalizedStatus = status?.toLowerCase() || '';

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  let colorClasses = 'bg-slate-100 text-slate-700';
  if (['committed', 'placed', 'received'].includes(normalizedStatus)) {
    colorClasses = 'bg-green-100 text-green-700 font-medium';
  } else if (['planning', 'proposed'].includes(normalizedStatus)) {
    colorClasses = 'bg-yellow-100 text-yellow-700 font-medium';
  } else if (normalizedStatus === 'urgent') {
    colorClasses = 'bg-red-100 text-red-700 font-medium';
  }

  return (
    <span className={`inline-block rounded-full ${sizeClasses[size]} ${colorClasses}`}>
      {status}
    </span>
  );
}