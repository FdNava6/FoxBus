import { Component } from "react";
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="mx-auto max-w-lg space-y-5 p-8">
          <h1 className="text-2xl font-bold">
            No pudimos mostrar esta pantalla
          </h1>
          <p>
            Recarga para consultar el estado guardado en el servidor. Si estabas
            pagando, verifica tu comprobante y tu reserva antes de intentar otro
            pago.
          </p>
          <button
            className="rounded-xl bg-fox-pink px-5 py-3 text-white"
            onClick={() => window.location.reload()}
          >
            Consultar nuevamente
          </button>
        </main>
      );
    return this.props.children;
  }
}
