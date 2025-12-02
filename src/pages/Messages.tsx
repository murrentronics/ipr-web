import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Message {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

const Messages = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);

  const loadMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
    let channel: any = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel('messages-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `user_id=eq.${user.id}` }, () => {
          loadMessages();
        })
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const openMessage = async (m: Message) => {
    setSelected(m);
    if (!m.is_read) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', m.id);
      // refresh list
      loadMessages();
    }
  };

  const closePopup = () => setSelected(null);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <Card>
          <CardHeader>
            <CardTitle>Your Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No messages</div>
            ) : (
              <div className="space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-4 border rounded-lg cursor-pointer ${!m.is_read ? 'bg-primary/10 font-semibold' : ''}`}
                    onClick={() => openMessage(m)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
                        <div className="text-lg">{m.title}</div>
                        { !m.is_read && <div className="text-sm text-muted-foreground">(Unread)</div> }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popup */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg max-w-xl w-full p-6 relative">
              <button className="absolute top-3 right-3" onClick={closePopup} aria-label="Close message">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold mb-2">{selected.title}</h2>
              <div className="text-sm text-muted-foreground mb-4">{new Date(selected.created_at).toLocaleString()}</div>
              <div className="whitespace-pre-wrap">{selected.body}</div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Messages;
