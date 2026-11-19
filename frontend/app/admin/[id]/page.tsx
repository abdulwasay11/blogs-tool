import Editor from '@/components/Editor';

export default function EditPost({ params }: { params: { id: string } }) {
  return <Editor id={params.id === 'new' ? null : params.id} />;
}
