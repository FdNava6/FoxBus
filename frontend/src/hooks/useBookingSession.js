import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/useCartStore";
import {
  bookingErrorMessage,
  reservationService,
} from "../services/reservationService";
import useCountdown from "./useCountdown";
import { ROUTES } from "../utils/constants";
import { clearDraft } from "../utils/bookingDraft";

export default function useBookingSession({ start = false } = {}) {
  const navigate = useNavigate();
  const { trip, requestKey, bookingSession, setBookingSession, clearCart } =
    useCartStore();
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const leaving = useRef(false);
  const code = bookingSession?.code;
  const remaining = useCountdown(
    bookingSession?.session_expires_at,
    bookingSession?.server_now,
  );
  const expire = useCallback(() => {
    leaving.current = true;
    if (code) clearDraft(code);
    clearCart();
    navigate(ROUTES.SEARCH, {
      replace: true,
      state: {
        origin: trip?.origin,
        destination: trip?.destination,
        date: trip?.date,
        passengers: 1,
        notice:
          "La sesión de 10 minutos terminó. Tus asientos se liberaron; selecciona nuevamente un viaje.",
      },
    });
  }, [clearCart, navigate, trip, code]);
  const leave = useCallback(
    (route) => {
      leaving.current = true;
      navigate(route);
      clearCart();
    },
    [clearCart, navigate],
  );

  useEffect(() => {
    if (leaving.current) return;
    if (!trip || !requestKey || (!code && !start)) {
      navigate(ROUTES.SEARCH, { replace: true });
      return;
    }
    let active = true;
    const refresh = async () => {
      try {
        const session = code
          ? await reservationService.getReservationByCode(code)
          : await reservationService.startSession({
              tripId: trip.id,
              date: trip.date,
              requestKey,
              passengers: trip.passengerCount || 1,
            });
        if (!active || leaving.current) return;
        if (
          ["expired", "cancelled"].includes(session.status) &&
          !session.payment_deadline_at
        ) {
          expire();
          return;
        }
        setBookingSession(session);
        setInitialized(true);
        setError("");
      } catch (e) {
        if (active) setError(bookingErrorMessage(e));
      }
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [trip, requestKey, code, start, navigate, expire, setBookingSession]);

  useEffect(() => {
    if (
      !initialized ||
      bookingSession?.status !== "active_session" ||
      remaining > 0
    )
      return;
    let active = true;
    // Una confirmación aceptada justo antes del límite puede estar aún en tránsito.
    reservationService
      .getReservationByCode(code)
      .then((session) => {
        if (!active) return;
        if (session.status === "active_session" || session.status === "expired")
          expire();
        else setBookingSession(session);
      })
      .catch(() => {
        if (active) expire();
      });
    return () => {
      active = false;
    };
  }, [
    initialized,
    bookingSession?.status,
    remaining,
    code,
    expire,
    setBookingSession,
  ]);
  return {
    session: bookingSession,
    remaining,
    initialized,
    error,
    setError,
    setBookingSession,
    expire,
    leave,
    ready:
      initialized &&
      bookingSession?.status === "active_session" &&
      remaining > 0,
  };
}
