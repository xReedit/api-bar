// Diagnóstico de /pago/iniciar sin pasar por Express ni la BD: replica
// getAccessToken + createSession con las MISMAS env del server e imprime el
// status y el body exactos de Niubiz.
//   node scripts/probar-niubiz.js            (monto 30)
//   node scripts/probar-niubiz.js 50         (otro monto)
require('dotenv').config();
const axios = require('axios');

const BASE = process.env.NIUBIZ_BASE_URL || 'https://apisandbox.vnforappstest.com';
const MERCHANT = process.env.NIUBIZ_MERCHANT_ID || '';
const monto = Number(process.argv[2] || 30);

const mostrar = (error) => {
    if (axios.isAxiosError(error)) {
        console.error('  status:', error.response?.status, '| code:', error.code);
        console.error('  body  :', JSON.stringify(error.response?.data ?? '').slice(0, 1500));
    } else {
        console.error('  ', error);
    }
};

(async () => {
    console.log('BASE     :', BASE);
    console.log('MERCHANT :', MERCHANT || '(VACÍO)');
    console.log('USER     :', process.env.NIUBIZ_USER || '(VACÍO)');
    console.log('PASS     :', process.env.NIUBIZ_PASS ? '(seteado)' : '(VACÍO)');

    let token;
    try {
        const resp = await axios.get(`${BASE}/api.security/v1/security`, {
            auth: { username: process.env.NIUBIZ_USER || '', password: process.env.NIUBIZ_PASS || '' },
            timeout: 15000,
            responseType: 'text',
            transformResponse: [(d) => d],
        });
        token = String(resp.data).trim();
        console.log('\n[1/2] accessToken OK:', token.slice(0, 25) + '...');
    } catch (error) {
        console.error('\n[1/2] accessToken FALLÓ (credenciales o URL equivocada):');
        mostrar(error);
        process.exit(1);
    }

    try {
        const resp = await axios.post(
            `${BASE}/api.ecommerce/v2/ecommerce/token/session/${MERCHANT}`,
            {
                channel: 'web',
                amount: monto,
                antifraud: {
                    clientIp: '200.60.1.1',
                    merchantDefineData: { MDD4: 'integraciones@papaya.com.pe', MDD32: 'papaya', MDD75: 'Registrado', MDD77: 1 },
                },
            },
            { headers: { Authorization: token, 'Content-Type': 'application/json' }, timeout: 15000 },
        );
        console.log('[2/2] sessionKey OK:', String(resp.data?.sessionKey || '').slice(0, 25) + '...');
        console.log('\nNiubiz responde bien: el 500 NO viene de la pasarela (mirá el INSERT en chatbot_pago).');
    } catch (error) {
        console.error('[2/2] createSession FALLÓ (merchantId, monto o antifraud):');
        mostrar(error);
        process.exit(1);
    }
})();
