DROP TABLE IF EXISTS messages;

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  sender VARCHAR NOT NULL,
  conversation_id VARCHAR NOT NULL,
  content TEXT NOT NULL,
  is_image BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_sender ON messages(sender);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
