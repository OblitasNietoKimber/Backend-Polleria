import { IconoBolsa } from "../common/Iconos";
import { PRODUCTS } from "../../data/products";

const formatoSoles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

const aliasProductos = {
  "pollo entero": "pollo a la brasa entero",
  "pollo a la brasa 1/4": "1/4 pollo a la brasa",
  "papas extra": "papa frita familiar",
  "gaseosa 1.5l": "inca kola 1.5 l",
};

function normalizarTexto(texto = "") {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\w\s/]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buscarProducto(item) {
  const id = Number(item.productoId || item.id);
  if (Number.isFinite(id)) {
    const productoPorId = PRODUCTS.find((producto) => producto.id === id);
    if (productoPorId) return productoPorId;
  }

  const nombre = normalizarTexto(item.nombre);
  const nombreBuscado = aliasProductos[nombre] || nombre;

  return PRODUCTS.find((producto) => normalizarTexto(producto.name) === nombreBuscado);
}

function prepararProductos(productos) {
  const totalGeneral = productos.reduce((acc, item) => acc + item.total, 0);

  return productos.slice(0, 5).map((item, index) => {
    const pct = totalGeneral ? Number(((item.total / totalGeneral) * 100).toFixed(1)) : 0;
    const producto = buscarProducto(item);

    return {
      ...item,
      num: index + 1,
      pct,
      imagen: producto?.image || item.imagen || null,
      totalFormateado: formatoSoles.format(item.total),
    };
  });
}

export default function ProductosTop({ productos = [] }) {
  const productosTop = prepararProductos(productos);

  return (
    <section className="ticket-card admin-products-card">
      <div className="admin-block-title">
        <IconoBolsa size={18} color="var(--ember)" />
        <span className="font-display">Productos mas vendidos</span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-products-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th>Cantidad vendida</th>
              <th>Total generado</th>
              <th>Participacion</th>
            </tr>
          </thead>
          <tbody>
            {productosTop.length === 0 ? (
              <tr>
                <td colSpan="5" className="admin-empty-cell">No hay productos vendidos registrados.</td>
              </tr>
            ) : productosTop.map((item) => (
              <tr key={item.num}>
                <td className="font-mono">{item.num}</td>
                <td>
                  <div className="admin-product-cell">
                    {item.imagen ? (
                      <img src={item.imagen} alt={item.nombre} className="admin-product-img" />
                    ) : (
                      <span className="admin-product-img admin-product-img-empty" aria-hidden="true">
                        <IconoBolsa size={15} />
                      </span>
                    )}
                    <span>{item.nombre}</span>
                  </div>
                </td>
                <td className="font-mono">{item.cantidad}</td>
                <td className="font-mono">{item.totalFormateado}</td>
                <td>
                  <div className="admin-participation">
                    {/* <progress> nativo: el navegador dibuja el ancho de la barra
                        según value/max, sin necesidad de calcular ni pasar un style */}
                    <progress className="admin-pill-bar" value={item.pct} max="100" />
                    <span className="font-mono">{item.pct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
