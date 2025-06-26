import Head from 'next/head';
import ChatInterface from '../components/ChatInterface';

export default function Home() {
  return (
    <>
      <Head>
        <title>LeanAtom - 地球化学 Lean 4 助手</title>
        <meta name="description" content="专业的地球化学和环境科学 Lean 4 数学证明助手" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo_w.png" />
      </Head>
      <main style={{ margin: 0, padding: 0, height: '100vh', overflow: 'hidden' }}>
        <ChatInterface />
      </main>
    </>
  );
}
