# Baseline · prototipo 06 · Locomoción continua y cambio de control

Práctica de tiros y pases en tercera persona con Three.js, con Rivera (07) y Silva (12). Controlas a quien recibe el pase; el otro jugador actúa como compañero de apoyo de la computadora. Cancha interior de 15 × 28 m, parquet claro generado por código, zonas azules, líneas, dos tableros y aros a 3,05 m y graderías oscuras. La escena se construye con geometría 3D; no contiene una fotografía como fondo.

## Iniciar

En GitHub Pages: https://josebecerram-svg.github.io/Juego-Basket/ . Las actualizaciones pueden tardar unos minutos; si ves una versión anterior, recarga sin caché.

Para desarrollo local: Node.js >=18, `npm run dev` en la carpeta del proyecto, y `http://localhost:5173` en esa misma máquina. No requiere instalación npm ni compilación. En un entorno remoto, localhost solo está disponible dentro de esa máquina. Requiere navegador con WebGL 2.

## Controles

- **W:** avanzar hacia donde mira el personaje. **S:** retroceder. **A/D:** desplazarse a izquierda/derecha respecto a esa orientación. El movimiento limita aceleración, frenado y variación de aceleración, con giros progresivos y diagonales normalizadas. Mantener WASD mezcla caminar, trotar y correr sin añadir teclas; los desplazamientos laterales y hacia atrás conservan un ritmo más corto y controlado. Se mantienen los límites de la cancha. El cuerpo acompaña la velocidad lateral y de retroceso; los pies mantienen puntos de apoyo en el mundo y alternan las zancadas.
- **Mueve el mouse sobre la cancha:** ajusta directamente la dirección y la elevación. El cuerpo gira y la cámara acompaña suavemente desde atrás, por encima y ligeramente a un lado. El encuadre se adapta para incluir el aro cercano, el cuerpo y el balón en vuelo.
- **Mantén clic izquierdo sobre la cancha:** carga potencia. **Suéltalo:** animación y lanzamiento. La carga llega al máximo en 1,6 segundos y se mantiene allí. No se necesita capturar ni bloquear el mouse; puedes salir de la cancha y usar la interfaz normalmente.
- También puedes ajustar **Dirección/Ángulo** con los deslizadores y mantener/soltar **Lanzar**, utilizable con mouse o pantalla táctil. La potencia se carga solo al mantener el botón izquierdo sobre la cancha o **Lanzar** (también mediante una pulsación táctil sostenida), nunca con E.
- WASD no intercepta escritura ni controles cuando un campo o botón tiene el foco. Haz clic en la cancha para volver a controlarla. Al cambiar de ventana se cancelan la carga y las teclas retenidas.
- Solo hay un balón. Puedes caminar durante la carga y el vuelo; el personaje frena progresivamente durante los 0,28 segundos de preparación y el balón sale desde la posición actual de sus manos. Al terminar el intento aparece **¡Canasta!** o **Fallaste**, y el balón vuelve automáticamente a la posición actual del jugador. No hace falta perseguirlo.

Desde la posición inicial, **dirección 0°, ángulo 55° y potencia cercana al 42 %** permiten practicar una canasta. Al moverte, tendrás que ajustar dirección y potencia. La guía es orientativa: muestra una parábola ideal sin rebotes y, antes de cargar, representa una potencia de referencia del 42 %.

## Compañero, recepción y cambio de control

- **E — Pasar:** envía el balón al otro jugador. También existe el botón **E Pasar**.
- Mientras el pase vuela sigues controlando al pasador. Al comprobar que el balón está dentro del alcance de las manos del receptor, el control pasa a este, sin mover ni intercambiar físicamente a los personajes.
- El receptor continúa el gesto de recepción y queda listo para moverse, apuntar y tirar con los mismos controles. La cámara transiciona hacia él, y la interfaz actualiza nombre y dorsal. Las etiquetas **TÚ / IA** distinguen al controlado y al compañero.
- WASD tiene una sola conexión activa: las teclas que mantengas presionadas se transfieren al receptor, y el jugador anterior conserva su movimiento residual bajo control exclusivo de la computadora. No se envía entrada de usuario a ambos.
- **E** vuelve a pasar al otro jugador y repite el cambio al recibir. No hace falta solicitar una devolución a un compañero que retenga el balón.
- Si el receptor se aparta más allá de la corrección asistida del pase y el balón no llega a sus manos, no cambia el control. El balón cae y se recupera automáticamente tras un breve intervalo. Los pases no cuentan como tiros ni suman puntos.
- No puedes pasar durante un tiro, una carga, otro pase o la recepción; aparece un aviso breve. Mantener E no encadena pases.
- El compañero se recoloca cuando te alejas demasiado o te acercas mucho. El alcance máximo de pase es 12 m.

## Jugador e interfaz

Adrián Rivera (07) y Mateo Silva (12): modelos humanos procedurales con proporciones anatómicas, rostro, manos, camiseta sin mangas con nombre y dorsal, pantalón, calcetines y zapatillas con suela y cordones. Animaciones articuladas de carrera y frenado, giro al apuntar, flexión de rodillas y elevación del balón al cargar, extensión y gesto de muñeca al soltar. El balón pasa de una posición de preparación al lado del pecho a la posición de salida sobre la cabeza.

La interfaz original **Baseline** integra el marcador arriba a la izquierda y el nombre y potencia abajo a la izquierda. El nombre y dorsal corresponden siempre al jugador controlado. La cámara reserva espacio para los paneles. Cada canasta suma **2 puntos**, una sola vez, inmediatamente al cruzar el aro. El marcador muestra canastas e intentos y conserva el último resultado al recuperar el balón. Los datos duran la sesión actual; recargar la página inicia una práctica nueva.

La potencia es azul en la zona baja, verde lima en la zona ideal y coral en la zona excesiva. La banda ideal se adapta a distancia y elevación; es orientativa y no corrige el apuntado ni garantiza encestar. Al soltar, valor y referencia de potencia quedan fijados hasta que termina el intento. **Ajustes de apuntado** despliega los controles alternativos de dirección/elevación.

## Organización y ajustes

- `src/config.js`: gravedad, fuerza mínima/máxima, carga, elevación, posición inicial, límites de cancha, velocidad/aceleración y asignación WASD configurable.
- `movement.js`: respuesta con límite de aceleración y de su variación, aceleración angular, mezcla progresiva caminar/trotar/correr, lateral y retroceso. Cada actor conserva su propio controlador.
- `footwork.js`: apoyo fijo en el mundo, duración/elevación adaptada al ritmo, curva de pie con llegada suave a una posición de contacto estable, recolocación al detenerse y pasos de giro. Las piernas usan cinemática inversa.
- `practice.js`: actores con identidad estable, transferencia exclusiva de entrada al recibir, compañero de apoyo, vuelo asistido limitado, comprobación de recepción y recuperación de pases fallidos.
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

Las pruebas cubren continuidad de aceleración y giro, mezcla de ritmos, apoyo sin deslizamiento y llegada suave del pie. Se verifica que no cambie el control antes de recibir, que el receptor herede únicamente la entrada activa, que el pasador sea IA y que un fallo no transfiera control. En Chromium se prueban WASD, E, ambos cambios de jugador, nombres de la interfaz, tiro y canasta con Silva, conservación del marcador y recuperación de un pase fallido. También se revisan caminata, trote, carrera, lateral, retroceso, frenada y giro.

## Límites

Modelo humano procedural estilizado, sin escaneo fotográfico ni captura de movimiento. Los pases tienen asistencia limitada para movimientos pequeños del receptor; no hay interceptaciones ni simulación competitiva de pases. Física de tiro simplificada; red decorativa y sin colisiones con el cuerpo, gradas o paredes. No hay recogida manual: recuperación automática. Movimiento para teclado; móvil conserva puntería y lanzamiento táctiles, sin joystick de desplazamiento. La computadora solo actúa como compañero de práctica; no hay historia, rivales, trucos ni modos multijugador. Three.js 0.170.0 se incluye localmente con su licencia MIT en `vendor/`.

## Publicación y caché

La versión **06.1** incluye un identificador de contenido en CSS, la entrada del juego y todo el grafo de módulos JavaScript, incluyendo Three.js. Así el navegador no mezcla módulos de publicaciones diferentes. El pie de página identifica la versión visible.

Después de modificar archivos, ejecuta `npm run version:assets` y luego `npm test` antes de subir a `main`. `npm run dev` actualiza automáticamente las versiones al arrancar. La comprobación de pruebas detecta recursos modificados sin actualizar su identificador. GitHub Pages sigue publicando desde la raíz de `main`, sin compilación externa. Para una primera carga después de una actualización, añade `?release=IDENTIFICADOR` a la URL del juego; esto renueva el documento HTML además de sus módulos.
