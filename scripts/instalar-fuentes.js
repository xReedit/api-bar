// Instala las fuentes del ticket (fonts/*.ttf) en ~/.fonts del usuario que
// corre la app, para que sharp/librsvg las encuentre al rasterizar el SVG del
// resumen de pedido. Corre en npm postinstall. Idempotente y NUNCA falla el
// install: cualquier error solo se loguea (sin fuente, el ticket sale con la
// letra genérica del sistema — feo pero funcional).
// En Windows (desarrollo) no hace nada: ahí ya existe Courier New.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

try {
    if (process.platform === 'win32') {
        process.exit(0);
    }

    const origen = path.join(__dirname, '..', 'fonts');
    if (!fs.existsSync(origen)) process.exit(0);

    const destino = path.join(os.homedir(), '.fonts');
    fs.mkdirSync(destino, { recursive: true });

    let copiadas = 0;
    for (const archivo of fs.readdirSync(origen)) {
        if (!archivo.toLowerCase().endsWith('.ttf')) continue;
        const dst = path.join(destino, archivo);
        if (!fs.existsSync(dst)) {
            fs.copyFileSync(path.join(origen, archivo), dst);
            copiadas++;
        }
    }

    if (copiadas > 0) {
        console.log(`instalar-fuentes: ${copiadas} fuente(s) copiada(s) a ${destino}`);
        try {
            execSync('fc-cache -f', { stdio: 'ignore' });
        } catch {
            console.log('instalar-fuentes: fc-cache no disponible (fontconfig las detectará solo)');
        }
    }
} catch (error) {
    console.error('instalar-fuentes: no se pudieron instalar (el ticket usara la letra generica):', error.message);
}
