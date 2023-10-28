import PileLayout from './Layout';
import NewPost from './NewPost';
import Posts from './Posts';

export default function Pile() {
  return (
    <PileLayout>
      <NewPost />
      <Posts />
    </PileLayout>
  );
}
