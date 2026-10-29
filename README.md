# Baseline · prototipo 05 · Movimiento y compañero de pases

Práctica de tiros y pases en tercera persona con Three.js, con Rivera (07) y un compañero controlado por la computadora, Silva (12). Cancha interior de 15 × 28 m, parquet claro generado por código, zonas azules, líneas, dos tableros y aros a 3,05 m y graderías oscuras. La escena se construye con geometría 3D; no contiene una fotografía como fondo.

## Iniciar

En GitHub Pages: https://josebecerram-svg.github.io/Juego-Basket/ . Las actualizaciones pueden tardar unos minutos; si ves una versión anterior, recarga sin caché.

Para desarrollo local: Node.js >=18, `npm run dev` en la carpeta del proyecto, y `http://localhost:5173` en esa misma máquina. No requiere instalación npm ni compilación. En un entorno remoto, localhost solo está disponible dentro de esa máquina. Requiere navegador con WebGL 2.

## Controles

- **W:** avanzar hacia donde mira el personaje. **S:** retroceder. **A/D:** desplazarse a izquierda/derecha respecto a esa orientación. El movimiento tiene aceleración y frenado graduales, giro limitado en velocidad, diagonales normalizadas y límites en las líneas de la cancha. El cuerpo acompaña la velocidad lateral y de retroceso; los pies mantienen puntos de apoyo en el mundo y alternan las zancadas.
- **Mueve el mouse sobre la cancha:** ajusta directamente la dirección y la elevación. El cuerpo gira y la cámara acompaña suavemente desde atrás, por encima y ligeramente a un lado. El encuadre se adapta para incluir el aro cercano, el cuerpo y el balón en vuelo.
- **Mantén clic izquierdo sobre la cancha:** carga potencia. **Suéltalo:** animación y lanzamiento. La carga llega al máximo en 1,6 segundos y se mantiene allí. No se necesita capturar ni bloquear el mouse; puedes salir de la cancha y usar la interfaz normalmente.
- También puedes ajustar **Dirección/Ángulo** con los deslizadores y mantener/soltar **Lanzar**, utilizable con mouse o pantalla táctil. La potencia se carga solo al mantener el botón izquierdo sobre la cancha o **Lanzar** (también mediante una pulsación táctil sostenida), nunca con E.
- WASD no intercepta escritura ni controles cuando un campo o botón tiene el foco. Haz clic en la cancha para volver a controlarla. Al cambiar de ventana se cancelan la carga y las teclas retenidas.
- Solo hay un balón. Puedes caminar durante la carga y el vuelo; el personaje frena progresivamente durante los 0,28 segundos de preparación y el balón sale desde la posición actual de sus manos. Al terminar el intento aparece **¡Canasta!** o **Fallaste**, y el balón vuelve automáticamente a la posición actual del jugador. No hace falta perseguirlo.

Desde la posición inicial, **dirección 0°, ángulo 55° y potencia cercana al 42 %** permiten practicar una canasta. Al moverte, tendrás que ajustar dirección y potencia. La guía es orientativa: muestra una parábola ideal sin rebotes y, antes de cargar, representa una potencia de referencia del 42 %.

## Compañero y pase

- **E — Pasar:** con el balón en tus manos, Rivera hace un pase de pecho a Silva. También existe el botón **E Pasar** en la interfaz.
- Silva orienta el cuerpo, prepara las manos, recibe y conserva el balón. **E — Pedir balón** solicita la devolución; también puedes moverte durante el vuelo de vuelta y recibirlo en tu nueva posición.
- La indicación **POSESIÓN**, el balón en las manos y el círculo bajo el jugador identifican al poseedor. Durante el vuelo se indica **BALÓN EN VUELO**.
- No puedes pasar durante un tiro, una carga, otro pase o la recepción. Aparece un aviso breve. Mantener E no encadena pases: hace falta una nueva pulsación después de recibir.
- El compañero se recoloca por iniciativa propia cuando te alejas demasiado o te acercas mucho, manteniendo una distancia útil. Los pases tienen un alcance máximo de 12 m; si estás lejos, acércate.
- Solo hay un balón. Los pases no alteran puntos ni intentos de tiro. La recuperación automática tras tirar al aro se conserva.

## Jugador e interfaz

Adrián Rivera, dorsal 07: modelo humano procedural con proporciones anatómicas, rostro, manos, camiseta sin mangas con nombre y dorsal, pantalón, calcetines y zapatillas con suela y cordones. Animaciones articuladas de carrera y frenado, giro al apuntar, flexión de rodillas y elevación del balón al cargar, extensión y gesto de muñeca al soltar. El balón pasa de una posición de preparación al lado del pecho a la posición de salida sobre la cabeza.

La interfaz original **Baseline** integra el marcador arriba a la izquierda y el nombre y potencia abajo a la izquierda. La cámara reserva espacio para los paneles. Cada canasta suma **2 puntos**, una sola vez, inmediatamente al cruzar el aro. El marcador muestra canastas e intentos y conserva el último resultado al recuperar el balón. Los datos duran la sesión actual; recargar la página inicia una práctica nueva.

La potencia es azul en la zona baja, verde lima en la zona ideal y coral en la zona excesiva. La banda ideal se adapta a distancia y elevación; es orientativa y no corrige el apuntado ni garantiza encestar. Al soltar, valor y referencia de potencia quedan fijados hasta que termina el intento. **Ajustes de apuntado** despliega los controles alternativos de dirección/elevación.

## Organización y ajustes

- `src/config.js`: gravedad, fuerza mínima/máxima, carga, elevación, posición inicial, límites de cancha, velocidad/aceleración y asignación WASD configurable.
- `movement.js`: velocidad con aceleración/frenado limitados, giro progresivo del cuerpo y entrada WASD; incluye estados de avance, lateral, retroceso y reposo.
- `footwork.js`: alternancia de pasos, apoyo fijo en coordenadas del mundo, recolocación al detenerse y pasos al girar. Las piernas usan cinemática inversa.
- `practice.js`: posesión, compañero de apoyo, preparación de pase, vuelo asistido, recepción y devolución con E.
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

Las pruebas también cubren aceleración, frenado, inversiones de dirección, límites de giro, pies anclados en el suelo, estabilidad de la posesión y pases consecutivos sin simultaneidad. En Chromium se verifica E con eventos reales: ida, rechazo durante el vuelo, posesión de Silva, devolución al jugador en movimiento, potencia siempre a cero al pasar y un tiro cargado que sigue encestando después de recuperar el balón.

## Límites

Modelo humano procedural estilizado, sin escaneo fotográfico ni captura de movimiento. Los pases son asistidos, con una curva de vuelo que termina en las manos del receptor; no hay interceptaciones ni simulación competitiva de pases. Física de tiro simplificada; red decorativa y sin colisiones con el cuerpo, gradas o paredes. No hay recogida manual: recuperación automática. Movimiento para teclado; móvil conserva puntería y lanzamiento táctiles, sin joystick de desplazamiento. La computadora solo actúa como compañero de práctica; no hay historia, rivales, trucos ni modos multijugador. Three.js 0.170.0 se incluye localmente con su licencia MIT en `vendor/`.
