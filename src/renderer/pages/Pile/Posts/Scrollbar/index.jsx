import React, { useCallback } from "react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import styles from './Scrollbar.module.scss';

// do not inline the component, as a fresh instance would be created with each re-render
// if you need to do some conditional logic, use Virtuoso's context prop to pass props inside the Scroller
const Scrollbar = React.forwardRef(({ style, ...props }, ref) => {
    // an alternative option to assign the ref is
    // <div ref={(r) => ref.current = r}>
    return <div style={{ ...style, overflow: 'overlay', overflowX: 'hidden' }} className={styles.scrollbar} ref={ref} {...props} />
  })
  

export default Scrollbar;
