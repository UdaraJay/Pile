import { useParams } from 'react-router-dom';
import styles from './Pile.module.scss';
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
