# Baseline · prototipo 07 · Cámara cercana y presentación de cancha

Práctica de tiros y pases en tercera persona con Three.js, con Rivera (07) y Silva (12). Controlas a quien recibe el pase; el otro jugador actúa como compañero de apoyo de la computadora. Cancha interior de 15 × 28 m, parquet claro generado por código, zonas azules, líneas, dos tableros y aros a 3,05 m y graderías oscuras. La escena se construye con geometría 3D; no contiene una fotografía como fondo.

## Iniciar

En GitHub Pages: https://josebecerram-svg.github.io/Juego-Basket/ . Las actualizaciones pueden tardar unos minutos; si ves una versión anterior, recarga sin caché.

Para desarrollo local: Node.js >=18, `npm run dev` en la carpeta del proyecto, y `http://localhost:5173` en esa misma máquina. No requiere instalación npm ni compilación. En un entorno remoto, localhost solo está disponible dentro de esa máquina. Requiere navegador con WebGL 2.

## Controles

- **W:** avanzar hacia donde mira el personaje. **S:** retroceder. **A/D:** desplazarse a izquierda/derecha respecto a esa orientación. El movimiento limita aceleración, frenado y variación de aceleración, con giros progresivos y diagonales normalizadas. Mantener WASD mezcla caminar, trotar y correr sin añadir teclas; los desplazamientos laterales y hacia atrás conservan un ritmo más corto y controlado. Se mantienen los límites de la cancha. El cuerpo acompaña la velocidad lateral y de retroceso; los pies mantienen puntos de apoyo en el mundo y alternan las zancadas.
- **Mueve el mouse sobre la cancha:** ajusta directamente la dirección y la elevación. El cuerpo gira y la cámara acompaña suavemente desde atrás, por encima y ligeramente a un lado. La cámara cercana acompaña desde atrás y prioriza el cuerpo completo del jugador controlado; el aro y el balón se ven cuando quedan dentro del campo visual. Si salen de vista, un indicador orienta hacia ellos.
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

## Cámara cercana y presentación

La cámara parte a unos **4,6 m detrás** del jugador, a **3 m de altura**, ligeramente a un lado. Sigue desplazamientos, giros y cambios de control mediante amortiguación; no se aleja para encuadrar obligatoriamente a todo el equipo o a un aro que esté detrás. Durante tiros altos puede retroceder ligeramente. La flecha sobre el suelo y la parábola indican la dirección real del lanzamiento, respetando el giro gradual del cuerpo.

Una comprobación de volumen evita que la cámara atraviese tableros, soportes, graderías, paredes o al compañero. Puede acercarse o desplazarse hacia un lado ante un obstáculo, manteniendo una separación de seguridad y la altura por encima de la cabeza. No se cambia a primera persona. Los parámetros están centralizados en `config.camera`.

La ambientación sigue siendo original de Baseline: parquet claro con respuesta de barniz, pintura azul, graderías oscuras, iluminación de gimnasio y sombras suaves. Las camisetas incorporan un tejido procedural fino. Los pasos anticipan los giros y el torso contrarresta la rotación de manera gradual; se conservan los modelos humanos, ritmos de caminar/trotar/correr, apoyos e identidad visual propios.

Los pases, tiros y el cambio automático al receptor no se rediseñan en esta etapa. No se añaden movimientos especiales ni combinaciones. Los movimientos especiales y los diseños futuros de pase/tiro siguen pendientes de instrucciones específicas; el acabado anatómico y las animaciones continúan siendo procedurales, sin captura de movimiento.

## Referencia física · versión 10

La imagen aportada se usa como guía de silueta y equipación, no como imagen del escenario ni como textura fotográfica. Rivera conserva su identidad original, con complexión atlética más robusta, piel oscura, cabello corto texturizado, camiseta roja holgada, shorts oscuros cerca de la rodilla, calcetines y zapatillas oscuros. La camiseta tiene más volumen en el bajo, pliegues con mayor resolución geométrica y ribetes cálidos. Los pantalones siguen la articulación de cada pierna y llevan un dobladillo contrastado. Silva mantiene la equipación azul y se distingue por altura, complexión, tez, peinado y rostro.

No se reproducen el rostro ni otras señas particulares de la persona de la foto. Tampoco se añaden las acciones mostradas en el collage: continúan únicamente desplazamiento, pase, recepción y tiro. Los controles, la física, la cámara y el cambio automático de jugador al recibir se conservan. El modelo continúa siendo procedural y estilizado; la referencia orienta sus proporciones y vestimenta, no implica un acabado fotográfico.

## Gestos continuos · versión 09

Se conservan las identidades originales de Rivera y Silva, con equipaciones marfil/azul sin logotipos; el frontal lleva solo el dorsal. Rivera gana desarrollo atlético proporcionado en hombros y piernas. Ambos usan contornos musculares interpolados, cara esculpida continua (sin esferas superpuestas en mandíbula/pómulos), cavidades orbitales, una línea de cabello más alta y microrrelieve de piel generado localmente. Se mantienen rostros, peinados, colores y estaturas distintos, ropa con pliegues, dedos articulados y zapatillas sin marcas.

**Pase:** E hace frenar gradualmente al pasador y orientar el cuerpo hacia el receptor; la mirada anticipa ese giro. La preparación comienza al completar la mayor parte del giro, lleva el balón al pecho y extiende los brazos. La trayectoria arranca exactamente en el anclaje compartido de las manos. El receptor flexiona las piernas y abre las manos progresivamente, absorbe la recepción y acerca el balón al costado. Cada actor conserva un reloj de gesto propio, por lo que el pasador termina el seguimiento aunque ya sea IA después del cambio de control. Un pase fallido cancela la espera de recepción y no cambia de jugador.

**Tiro:** la profundidad de flexión depende de la carga y se conserva al soltar el botón; incluso un toque breve tiene una pequeña preparación. La extensión de piernas acompaña la elevación del balón hasta la misma salida física anterior. Las palmas se orientan hacia su superficie y conservan el contacto durante toda la preparación. Tras la suelta, la muñeca se flexiona gradualmente, la mano de guía baja antes que el brazo lanzador y la postura se recupera con suavidad. Se mantiene la potencia/dirección elegida y la física de tiro existente; no se añade asistencia para encestar.

`test/animation.test.js` comprueba orientación antes del pase, continuidad del contacto antes/después de la suelta, recepción, fallo sin transferencia, flexión/extensión de piernas y tiros de potencia baja/media/alta en varias direcciones. En Chromium también se miden las palmas renderizadas respecto al balón, se revisan las fases de pase/tiro y se verifican canasta, fallo, movimiento, nombres y cambios de control en ambos sentidos. El acabado continúa siendo procedural y estilizado, sin escaneo facial, simulación de tela ni captura de movimiento; la referencia deportiva es de calidad general y no se usan activos de NBA 2K ni semejanzas de atletas reales.

## Atletas originales · versión 08

Rivera mide 1,96 m y presenta una silueta atlética, piel cálida, cabello corto y camiseta marfil. Silva mide 2,06 m, tiene hombros más anchos, piel oscura, cabello rizado corto, perilla y equipación azul con ribetes arena. Son identidades originales: las referencias generales son la agilidad de un exterior y la presencia física de un jugador interior, sin copiar rostros, nombres, marcas, tatuajes ni uniformes reales.

Las proporciones se ajustan por anatomía, no escalando el modelo completo: se mantienen los pies en el suelo y las manos en las posiciones del balón compartidas con la física. Los contornos musculares, mandíbula, pómulos, párpados, iris, nariz, labios, orejas y cabello están modelados en geometría. Los uniformes incorporan tejido, pliegues suaves y dorsales adaptados a la superficie curva. Las zapatillas tienen collar acolchado, lengüeta, talón, cordones y suela segmentada. Los dedos tienen segmentos articulados que se flexionan al sostener y soltar el balón.

Los hombros acompañan la inclinación y contrarrotación del torso; la mirada sigue el balón durante su vuelo y en el compañero, con giro limitado y amortiguado del cuello y parpadeo desfasado por personaje. Se conservan los apoyos de pies y la mezcla gradual de movimiento. Cada modelo mantiene su identidad al cambiar el control y la interfaz conserva nombre y dorsal del actor activo. No se modifica la física de pases/tiros, la cámara ni los controles.

El acabado es procedural y todavía estilizado: no equivale a un personaje fotorrealista escaneado ni a una animación con captura de movimiento. El detalle facial fino y la deformación de tela mediante simulación quedan pendientes.

## Jugador e interfaz

Adrián Rivera (07) y Mateo Silva (12): modelos humanos procedurales con proporciones anatómicas, rostro, manos, camiseta sin mangas con nombre y dorsal, pantalón, calcetines y zapatillas con suela y cordones. Animaciones articuladas de carrera y frenado, giro al apuntar, flexión de rodillas y elevación del balón al cargar, extensión y gesto de muñeca al soltar. El balón pasa de una posición de preparación al lado del pecho a la posición de salida sobre la cabeza.

La interfaz original **Baseline** integra el marcador arriba a la izquierda y el nombre y potencia abajo a la izquierda. El nombre y dorsal corresponden siempre al jugador controlado. El encuadre inicial reserva espacio para los paneles y un aviso discreto ayuda a localizar el balón o el aro fuera de vista. Cada canasta suma **2 puntos**, una sola vez, inmediatamente al cruzar el aro. El marcador muestra canastas e intentos y conserva el último resultado al recuperar el balón. Los datos duran la sesión actual; recargar la página inicia una práctica nueva.

La potencia es azul en la zona baja, verde lima en la zona ideal y coral en la zona excesiva. La banda ideal se adapta a distancia y elevación; es orientativa y no corrige el apuntado ni garantiza encestar. Al soltar, valor y referencia de potencia quedan fijados hasta que termina el intento. **Ajustes de apuntado** despliega los controles alternativos de dirección/elevación.

## Organización y ajustes

- `src/config.js`: gravedad, fuerza mínima/máxima, carga, elevación, posición inicial, límites de cancha, velocidad/aceleración y asignación WASD configurable.
- `movement.js`: respuesta con límite de aceleración y de su variación, aceleración angular, mezcla progresiva caminar/trotar/correr, lateral y retroceso. Cada actor conserva su propio controlador.
- `footwork.js`: apoyo fijo en el mundo, duración/elevación adaptada al ritmo, curva de pie con llegada suave a una posición de contacto estable, recolocación al detenerse y pasos de giro. Las piernas usan cinemática inversa.
- `practice.js`: actores con identidad estable, transferencia exclusiva de entrada al recibir, compañero de apoyo, vuelo asistido limitado, comprobación de recepción y recuperación de pases fallidos.
- `physics.js`: balón en manos, carga, suelta desde una posición dinámica, trayectoria 3D, colisiones con ambos tableros y aros y suelo. La canasta exige un cruce descendente dentro de la abertura, antes del primer contacto con el suelo, una sola vez por intento.
- `camera.js`: seguimiento cercano desde atrás, amortiguación de posición/giro/altura, volumen de seguridad y alternativas de hombro frente a obstáculos. Prioriza al controlado y evita el zoom panorámico.
- `gym.js`: parquet procedural, pintura, líneas, canastas, gradas e iluminación interior.
- `athletes.js`: perfiles visuales originales, estatura, complexión, rostro y equipación de cada actor.
- `player.js`: modelo anatómico, equipación y articulaciones; brazos con cinemática inversa para mantener las manos en el balón.
- `pose.js`: preparación, carga, lanzamiento y transición de la postura al correr y detenerse. Comparte la posición del balón con la física.
- `hud.js`: marcador de práctica, último resultado y referencia de potencia según distancia/elevación.
- `controls.js`: teclado, apuntado directo, clic izquierdo y controles alternativos.
- `scene.js` / `main.js`: renderizado y bucle físico a 240 Hz.

## Validación

`npm test` ejecuta pruebas de WASD, diagonales, límites y frenado; posición dinámica de salida; tiros corto, largo y lateral; canastas, intentos consecutivos y exclusión de tiros simultáneos; colisiones con suelo/tablero/aro; y cámara cercana en escritorio/móvil: cuerpo visible, distancia, posición detrás y por encima, barrido contra obstáculos y continuidad durante el cambio de control.

Las pruebas cubren continuidad de aceleración y giro, mezcla de ritmos, apoyo sin deslizamiento y llegada suave del pie. Se verifica que no cambie el control antes de recibir, que el receptor herede únicamente la entrada activa, que el pasador sea IA y que un fallo no transfiera control. En Chromium se prueban WASD, E, ambos cambios de jugador, nombres de la interfaz, tiro y canasta con Silva, conservación del marcador y recuperación de un pase fallido. También se revisan caminata, trote, carrera, lateral, retroceso, frenada y giro.

## Límites

Modelo humano procedural estilizado, sin escaneo fotográfico ni captura de movimiento. Los pases tienen asistencia limitada para movimientos pequeños del receptor; no hay interceptaciones ni simulación competitiva de pases. Física de tiro simplificada; red decorativa y sin colisiones con el cuerpo, gradas o paredes. No hay recogida manual: recuperación automática. Movimiento para teclado; móvil conserva puntería y lanzamiento táctiles, sin joystick de desplazamiento. La computadora solo actúa como compañero de práctica; no hay historia, rivales, trucos ni modos multijugador. Three.js 0.170.0 se incluye localmente con su licencia MIT en `vendor/`.

## Publicación y caché

La versión actual incluye un identificador de contenido en CSS, la entrada del juego y todo el grafo de módulos JavaScript, incluyendo Three.js. Así el navegador no mezcla módulos de publicaciones diferentes. El pie de página identifica la versión visible; esta etapa muestra **10**.

Después de modificar archivos, ejecuta `npm run version:assets` y luego `npm test` antes de subir a `main`. `npm run dev` actualiza automáticamente las versiones al arrancar. La comprobación de pruebas detecta recursos modificados sin actualizar su identificador. GitHub Pages sigue publicando desde la raíz de `main`, sin compilación externa. Para una primera carga después de una actualización, añade `?release=IDENTIFICADOR` a la URL del juego; esto renueva el documento HTML además de sus módulos.
