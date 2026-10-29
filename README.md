# Baseline · prototipo 04 · Jugador y presentación deportiva

Práctica de tiro en tercera persona con Three.js. Cancha interior de 15 × 28 m, parquet claro generado por código, zonas azules, líneas, dos tableros y aros a 3,05 m y graderías oscuras. La escena se construye con geometría 3D; no contiene una fotografía como fondo.

## Iniciar

En GitHub Pages: https://josebecerram-svg.github.io/Juego-Basket/ . Las actualizaciones pueden tardar unos minutos; si ves una versión anterior, recarga sin caché.

Para desarrollo local: Node.js >=18, `npm run dev` en la carpeta del proyecto, y `http://localhost:5173` en esa misma máquina. No requiere instalación npm ni compilación. En un entorno remoto, localhost solo está disponible dentro de esa máquina. Requiere navegador con WebGL 2.

## Controles

- **W:** avanzar hacia donde mira el personaje. **S:** retroceder. **A/D:** desplazarse a izquierda/derecha respecto a esa orientación. El movimiento tiene aceleración, diagonales normalizadas y límites en las líneas de la cancha.
- **Mueve el mouse sobre la cancha:** ajusta directamente la dirección y la elevación. El cuerpo gira y la cámara acompaña suavemente desde atrás, por encima y ligeramente a un lado. El encuadre se adapta para incluir el aro cercano, el cuerpo y el balón en vuelo.
- **Mantén clic izquierdo sobre la cancha:** carga potencia. **Suéltalo:** animación y lanzamiento. La carga llega al máximo en 1,6 segundos y se mantiene allí. No se necesita capturar ni bloquear el mouse; puedes salir de la cancha y usar la interfaz normalmente.
- También puedes ajustar **Dirección/Ángulo** con los deslizadores y mantener/soltar **Lanzar**, utilizable con mouse o pantalla táctil. El botón admite Espacio/Enter cuando tiene el foco.
- WASD no intercepta escritura ni controles cuando un campo o botón tiene el foco. Haz clic en la cancha para volver a controlarla. Al cambiar de ventana se cancelan la carga y las teclas retenidas.
- Solo hay un balón. Puedes caminar durante la carga y el vuelo; la posición se fija durante los 0,28 segundos de preparación para soltar el balón desde las manos. Al terminar el intento aparece **¡Canasta!** o **Fallaste**, y el balón vuelve automáticamente a la posición actual del jugador. No hace falta perseguirlo.

Desde la posición inicial, **dirección 0°, ángulo 55° y potencia cercana al 42 %** permiten practicar una canasta. Al moverte, tendrás que ajustar dirección y potencia. La guía es orientativa: muestra una parábola ideal sin rebotes y, antes de cargar, representa una potencia de referencia del 42 %.

## Jugador e interfaz

Adrián Rivera, dorsal 07: modelo humano procedural con proporciones anatómicas, rostro, manos, camiseta sin mangas con nombre y dorsal, pantalón, calcetines y zapatillas con suela y cordones. Animaciones articuladas de carrera y frenado, giro al apuntar, flexión de rodillas y elevación del balón al cargar, extensión y gesto de muñeca al soltar. El balón pasa de una posición de preparación al lado del pecho a la posición de salida sobre la cabeza.

La interfaz original **Baseline** integra el marcador arriba a la izquierda y el nombre y potencia abajo a la izquierda. La cámara reserva espacio para los paneles. Cada canasta suma **2 puntos**, una sola vez, inmediatamente al cruzar el aro. El marcador muestra canastas e intentos y conserva el último resultado al recuperar el balón. Los datos duran la sesión actual; recargar la página inicia una práctica nueva.

La potencia es azul en la zona baja, verde lima en la zona ideal y coral en la zona excesiva. La banda ideal se adapta a distancia y elevación; es orientativa y no corrige el apuntado ni garantiza encestar. Al soltar, valor y referencia de potencia quedan fijados hasta que termina el intento. **Ajustes de apuntado** despliega los controles alternativos de dirección/elevación.

## Organización y ajustes

- `src/config.js`: gravedad, fuerza mínima/máxima, carga, elevación, posición inicial, límites de cancha, velocidad/aceleración y asignación WASD configurable.
- `movement.js`: movimiento relativo a la orientación del jugador y contención dentro de la cancha.
- `physics.js`: balón en manos, carga, suelta desde una posición dinámica, trayectoria 3D, colisiones con ambos tableros y aros y suelo. La canasta exige un cruce descendente dentro de la abertura, antes del primer contacto con el suelo, una sola vez por intento.
- `camera.js`: seguimiento en tercera persona y ajuste de encuadre, sin cámara desde los ojos.
- `gym.js`: parquet procedural, pintura, líneas, canastas, gradas e iluminación interior.
- `player.js`: modelo anatómico, equipación y articulaciones; brazos con cinemática inversa para mantener las manos en el balón.
- `pose.js`: preparación, carga, lanzamiento y transición de la postura al correr y detenerse. Comparte la posición del balón con la física.
- `hud.js`: marcador de práctica, último resultado y referencia de potencia según distancia/elevación.
- `controls.js`: teclado, apuntado directo, clic izquierdo y controles alternativos.
- `scene.js` / `main.js`: renderizado y bucle físico a 240 Hz.

## Validación

`npm test` ejecuta pruebas de WASD, diagonales, límites y frenado; posición dinámica de salida; tiros corto, largo y lateral; canastas, intentos consecutivos y exclusión de tiros simultáneos; colisiones con suelo/tablero/aro; y encuadre de cámara en escritorio/móvil en distintas posiciones y orientaciones.

También se comprueba en Chromium el movimiento con teclas reales, apuntado con mouse, carga/suelta de clic izquierdo, aciertos/fallos y respeto del foco de la interfaz. Esta etapa verifica las tres zonas de potencia, la barra fijada al soltar, la actualización inmediata del marcador, su conservación entre tiros y los gestos de carrera, carga y lanzamiento en escritorio/móvil.

## Límites

Modelo humano procedural estilizado, sin escaneo fotográfico ni captura de movimiento. Física simplificada; red decorativa y sin colisiones con el cuerpo, gradas o paredes. No hay recogida manual: recuperación automática. Movimiento para teclado; móvil conserva puntería y lanzamiento táctiles, sin joystick de desplazamiento. No hay historia, rivales, trucos ni modos multijugador. Three.js 0.170.0 se incluye localmente con su licencia MIT en `vendor/`.
