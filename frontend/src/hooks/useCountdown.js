import { useEffect, useState } from 'react';
import { remainingTime } from '../utils/bookingTime';

export default function useCountdown(deadline, serverNow) {
  const [sample, setSample] = useState(null);
  // El reloj del servidor fija el tiempo restante; performance evita cambios en el reloj local.
  useEffect(() => {
    const initial = remainingTime(deadline, serverNow);
    const start = performance.now();
    const update = () => setSample({ deadline, serverNow, remaining: Math.max(0, initial - (performance.now() - start)) });
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 250);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [deadline, serverNow]);
  return sample && sample.deadline === deadline && sample.serverNow === serverNow
    ? sample.remaining : remainingTime(deadline, serverNow);
}
