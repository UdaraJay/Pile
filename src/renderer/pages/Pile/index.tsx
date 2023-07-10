import { useParams } from 'react-router-dom';
import styles from './Pile.module.scss';
import PileLayout from './Layout';
import NewPost from './NewPost';
import Posts from './Posts';
import { usePostsContext } from 'renderer/context/PostsContext';
import { useEffect } from 'react';

export default function Pile() {
  const { pileName } = useParams();
  const { getToday } = usePostsContext();

  return (
    <PileLayout>
      <NewPost />
      <Posts />
    </PileLayout>
  );
}
