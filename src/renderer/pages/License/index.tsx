import { useEffect, useState } from 'react';
import styles from './License.module.scss';
import { TrashIcon } from 'renderer/icons';
import { Link } from 'react-router-dom';
import { usePilesContext } from '../../context/PilesContext';

const pilesList = ['Users/uj/Personal', 'Users/uj/Startup', 'Users/uj/School'];

export default function License() {
  const { piles } = usePilesContext();
  const [folderExists, setFolderExists] = useState(false);

  useEffect(() => {}, []);

  return (
    <div className={styles.frame}>
      <div className={styles.header}>
        <Link to="/" className={styles.back}>
          ← Back
        </Link>
        <div className={styles.name}>License</div>
      </div>
      <div className={styles.text}>
        <b>The MIT License (MIT)</b> <br />
        <br /> Copyright (c) 2023-present Udara Jay <br />
        <br />
        Permission is hereby granted, free of charge, to any person obtaining a
        copy of this software and associated documentation files (the
        "Software"), to deal in the Software without restriction, including
        without limitation the rights to use, copy, modify, merge, publish,
        distribute, sublicense, and/or sell copies of the Software, and to
        permit persons to whom the Software is furnished to do so, subject to
        the following conditions: The above copyright notice and this permission
        notice shall be included in all copies or substantial portions of the
        Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
        KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
        IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
        CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
        TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
        SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
      </div>
    </div>
  );
}
