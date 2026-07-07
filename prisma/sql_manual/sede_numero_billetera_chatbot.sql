-- Número de billetera digital (Yape/Plin) de la sede para el chatbot.
-- Cuando el cliente pregunta "¿a qué número yapeo?", el bot responde con este número.
ALTER TABLE sede ADD COLUMN numero_billetera_chatbot VARCHAR(30) NULL DEFAULT NULL;
