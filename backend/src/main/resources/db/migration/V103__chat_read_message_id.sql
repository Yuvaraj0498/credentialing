-- Chat read markers by message id. Timestamps are not precise enough on MariaDB with the MySQL driver
-- (fractional seconds are dropped), so two messages in the same second were treated as one point in time.
ALTER TABLE chat_read ADD COLUMN last_read_message_id BIGINT NULL;

UPDATE chat_read r
   SET r.last_read_message_id = (SELECT MAX(m.id) FROM chat_message m
                                  WHERE m.conversation_id = r.conversation_id AND m.created_at <= r.last_read_at);
