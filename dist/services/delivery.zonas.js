"use strict";
// Geometría pura del delivery por zonas (sin dependencias, sin I/O).
// Portado de restobar-2026 packages/shared/src/geo.ts.
//
// Convención: { lat, lng } en grados decimales. Los polígonos son anillos
// abiertos (el último punto se conecta con el primero implícito).
// Límite conocido: no soporta polígonos que crucen el antimeridiano (±180°);
// no aplica a Perú.
//
// Las zonas viven dentro del JSON sede_costo_delivery.parametros.zonas
// (sin DDL: el usuario MySQL de la app no tiene CREATE y prisma/ es por
// entorno). El ORDEN del array es la prioridad: en solape gana el índice menor.
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.describirDelivery = exports.resolverModo = exports.resolverZona = exports.validarZonas = exports.puntoEnZona = exports.puntoEnCirculo = exports.puntoEnPoligono = exports.haversineKm = void 0;
var R_KM = 6371;
/** Distancia en km entre dos puntos (fórmula del haversine). */
var haversineKm = function (a, b) {
    var dLat = ((b.lat - a.lat) * Math.PI) / 180;
    var dLng = ((b.lng - a.lng) * Math.PI) / 180;
    var s = Math.pow(Math.sin(dLat / 2), 2) +
        Math.cos((a.lat * Math.PI) / 180) *
            Math.cos((b.lat * Math.PI) / 180) *
            Math.pow(Math.sin(dLng / 2), 2);
    return 2 * R_KM * Math.asin(Math.sqrt(s));
};
exports.haversineKm = haversineKm;
/** Ray casting: ¿el punto está dentro del polígono? Mínimo 3 vértices. */
var puntoEnPoligono = function (p, puntos) {
    if (puntos.length < 3)
        return false;
    var dentro = false;
    for (var i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
        var xi = puntos[i].lng;
        var yi = puntos[i].lat;
        var xj = puntos[j].lng;
        var yj = puntos[j].lat;
        var intersecta = yi > p.lat !== yj > p.lat &&
            p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi;
        if (intersecta)
            dentro = !dentro;
    }
    return dentro;
};
exports.puntoEnPoligono = puntoEnPoligono;
/** ¿El punto está dentro del círculo (centro + radio en km)? Borde inclusivo. */
var puntoEnCirculo = function (p, centro, radioKm) {
    return (0, exports.haversineKm)(p, centro) <= radioKm;
};
exports.puntoEnCirculo = puntoEnCirculo;
/** Despacha según el tipo de zona. */
var puntoEnZona = function (p, z) {
    return z.tipo === 'poligono'
        ? (0, exports.puntoEnPoligono)(p, z.puntos || [])
        : (0, exports.puntoEnCirculo)(p, z.centro, Number(z.radio_km));
};
exports.puntoEnZona = puntoEnZona;
var esLatLng = function (v) {
    return v != null && Number.isFinite(Number(v.lat)) && Number.isFinite(Number(v.lng));
};
var aLatLng = function (v) { return ({ lat: Number(v.lat), lng: Number(v.lng) }); };
/**
 * Sanea el array crudo del JSON de la BD: filtra zonas malformadas (polígono
 * con <3 puntos, círculo sin centro o radio <= 0, costo no numérico) y
 * coacciona strings numéricos ("4" → 4, herencia del panel que guarda strings).
 */
var validarZonas = function (raw) {
    if (!Array.isArray(raw))
        return [];
    var zonas = [];
    for (var _i = 0, raw_1 = raw; _i < raw_1.length; _i++) {
        var z = raw_1[_i];
        if (!z || typeof z !== 'object')
            continue;
        var costo = Number(z.costo);
        if (!Number.isFinite(costo) || costo < 0)
            continue;
        var tiempoRaw = Number(z.tiempo_aprox_entrega);
        var tiempo = Number.isFinite(tiempoRaw) && tiempoRaw > 0 ? tiempoRaw : null;
        var base = {
            nombre: String(z.nombre || 'Zona'),
            costo: costo,
            tiempo_aprox_entrega: tiempo
        };
        if (z.tipo === 'poligono') {
            var puntos = Array.isArray(z.puntos)
                ? z.puntos.filter(esLatLng).map(aLatLng)
                : [];
            if (puntos.length < 3)
                continue;
            zonas.push(__assign(__assign({}, base), { tipo: 'poligono', puntos: puntos }));
        }
        else if (z.tipo === 'circulo') {
            var radio = Number(z.radio_km);
            if (!esLatLng(z.centro) || !Number.isFinite(radio) || radio <= 0)
                continue;
            zonas.push(__assign(__assign({}, base), { tipo: 'circulo', centro: aLatLng(z.centro), radio_km: radio }));
        }
    }
    return zonas;
};
exports.validarZonas = validarZonas;
/** Primera zona del array que contiene el punto (menor índice gana en solape). */
var resolverZona = function (zonas, p) {
    for (var i = 0; i < zonas.length; i++) {
        if ((0, exports.puntoEnZona)(p, zonas[i]))
            return { cubierto: true, zona: zonas[i], indice: i };
    }
    return { cubierto: false };
};
exports.resolverZona = resolverZona;
/**
 * Modo de cobro de la sede. Si `parametros.modo` falta (configs anteriores a
 * este campo), se infiere con el MISMO criterio del panel Piter
 * (obtener_coordenadas_del_cliente === 'NO' → fijo, cualquier otra cosa →
 * variable). Antes el backend exigía === 'SI' para calcular variable, y las
 * sedes sin la clave cobraban fijo aunque el panel mostrara "Variable" (BUG A).
 */
var resolverModo = function (parametros) {
    var modo = parametros === null || parametros === void 0 ? void 0 : parametros.modo;
    if (modo === 'fijo' || modo === 'variable' || modo === 'zonas')
        return modo;
    return (parametros === null || parametros === void 0 ? void 0 : parametros.obtener_coordenadas_del_cliente) === 'NO' ? 'fijo' : 'variable';
};
exports.resolverModo = resolverModo;
/**
 * Descripción de tarifas para el bot (/config y /contexto — una sola fuente).
 * En modo zonas lista nombres y precios: el LLM explica mejor con datos
 * concretos que con "según tu zona".
 */
var describirDelivery = function (parametros) {
    var modo = (0, exports.resolverModo)(parametros);
    if (modo === 'fijo') {
        var costo = Number((parametros === null || parametros === void 0 ? void 0 : parametros.costo_fijo) || 0) || Number((parametros === null || parametros === void 0 ? void 0 : parametros.km_base_costo) || 0);
        return "Costo fijo de delivery: S/".concat(costo, " a cualquier zona de la ciudad");
    }
    if (modo === 'zonas') {
        var zonas = (0, exports.validarZonas)(parametros === null || parametros === void 0 ? void 0 : parametros.zonas);
        if (zonas.length > 0) {
            var lista = zonas
                .map(function (z) { return "".concat(z.nombre, " S/").concat(z.costo).concat(z.tiempo_aprox_entrega ? " (~".concat(z.tiempo_aprox_entrega, " min)") : ''); })
                .join(', ');
            return "Delivery por zonas: ".concat(lista, ". Fuera de estas zonas no tenemos cobertura. El costo exacto se confirma al indicar la direcci\u00F3n o compartir la ubicaci\u00F3n.");
        }
        // Sin zonas válidas el cálculo cae a variable; describir eso.
    }
    return "Costo base S/".concat(Number((parametros === null || parametros === void 0 ? void 0 : parametros.km_base_costo) || 0), " hasta ").concat(Number((parametros === null || parametros === void 0 ? void 0 : parametros.km_base) || 0), " km, luego S/").concat(Number((parametros === null || parametros === void 0 ? void 0 : parametros.km_adicional_costo) || 0), " por km adicional");
};
exports.describirDelivery = describirDelivery;
