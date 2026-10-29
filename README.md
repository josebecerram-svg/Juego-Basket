# Basket · prototipo 01

Prototipo de práctica de tiro en JavaScript y Canvas 2D, sin dependencias externas. Requiere Node.js 18 o posterior y un navegador moderno.

## Abrir

Desde este directorio ejecuta `npm run dev` y abre `http://localhost:5173` en tu navegador. Para otro puerto, usa `PORT=8080 npm run dev`. No requiere instalar paquetes ni compilar.

## Probar

Pulsa **Lanzar**. El jugador prepara el tiro y suelta el balón desde las manos. El botón permanece deshabilitado durante el intento. La pelota cruza el aro, rebota en el suelo y vuelve automáticamente al jugador; repite varios tiros. El mensaje indica «¡Canasta!» o «Inténtalo de nuevo».

Ejecuta `npm test` para comprobar liberación, tres tiros consecutivos, bloqueo de tiros simultáneos, colisiones con suelo, tablero y aro, cruces ascendentes y exteriores y protección contra canastas duplicadas.

## Organización

- `src/config.js`: fuerza, ángulo (radianes), gravedad, posición de salida, dimensiones y tiempos.
- `src/physics.js`: estados, integración a paso fijo y colisiones.
- `src/controls.js`: botón provisional, sin teclas asignadas.
- `src/camera.js`: encuadre adaptable.
- `src/player.js`: figura y animación básica de brazos.
- `src/scene.js`: cancha, tablero, aro, red y balón.
- `src/main.js`: bucle y mensajes.

## Límites de esta etapa

Vista lateral 2D y figuras provisionales. Tiro fijo y determinista, calibrado para encestar: no hay puntería ni variación aleatoria. Para ensayar fallos, ajusta fuerza o ángulo en `src/config.js`. Física simplificada: el aro se representa por dos secciones circulares; el tablero es una superficie vertical y la red es visual. No hay desplazamiento, rivales, multijugador ni controles definitivos. El resultado aparece al encestar o tocar el suelo y el balón se devuelve tras completar el intento.
