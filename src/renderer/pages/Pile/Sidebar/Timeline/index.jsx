import { useParams } from 'react-router-dom';
import styles from './Timeline.module.scss';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useStatem, useRef } from 'react';
import { DateTime } from 'luxon';
import { useTimelineContext } from 'renderer/context/TimelineContext';

function isToday(date) {
  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function DayComponent({ date }) {
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayName = dayNames[date.getDay()];
  const dayNumber = date.getDate();

  return (
    <div
      className={`${styles.day} ${isToday(date) && styles.today} ${
        dayName == 'S' && styles.monday
      }`}
    >
      <div className={styles.dayLine}></div>
      <div className={styles.dayName}>{dayName}</div>
      <div className={styles.dayNumber}>{dayNumber}</div>
    </div>
  );
}

function WeekComponent({ startDate, endDate }) {
  const weekOfMonth = Math.floor(startDate.getDate() / 7) + 1;
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthName = monthNames[startDate.getMonth()];
  const year = startDate.getFullYear();
  let days = [];
  for (
    let date = new Date(startDate);
    date <= endDate;
    date.setDate(date.getDate() + 1)
  ) {
    days.push(<DayComponent key={date.toString()} date={new Date(date)} />);
  }

  const weekOfMonthText = () => {
    switch (weekOfMonth) {
      case 1:
        return '1st week';
        break;
      case 2:
        return '2nd week';
        break;
      case 3:
        return '3rd week';
        break;
      case 4:
        return '4th week';
        break;
      default:
        return '';
    }
  };

  return (
    <div className={styles.week}>
      <div className={styles.text}>
        {monthName} {year} / Week {weekOfMonth}
      </div>
      {days.reverse()}
      <div className={styles.line}></div>
    </div>
  );
}

const Timeline = () => {
  const scrollRef = useRef(null);
  const scrubRef = useRef(null);
  const { closestDate } = useTimelineContext();

  const getWeeks = () => {
    let weeks = [];
    let now = new Date();
    now.setHours(0, 0, 0, 0);

    let weekEnd = new Date(now);

    // If it's not Monday, find the previous Monday
    while (now.getDay() !== 1) {
      now.setDate(now.getDate() - 1);
    }

    let weekStart = new Date(now);
    weeks.push({ start: weekStart, end: weekEnd });

    for (let i = 0; i < 25; i++) {
      weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() - 1);
      weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weeks.push({ start: new Date(weekStart), end: new Date(weekEnd) });
    }

    return weeks;
  };

  let weeks = getWeeks().map((week, index) => (
    <WeekComponent key={index} startDate={week.start} endDate={week.end} />
  ));

  useEffect(() => {
    if (!scrubRef.current) return;
    if (!scrollRef.current) return;
    let oneDay = 24 * 60 * 60 * 1000;
    const now = new Date();
    const past = new Date(closestDate);
    let diffInMilliSeconds = Math.abs(now - past);
    let diffInDays = Math.round(diffInMilliSeconds / oneDay);

    let scrollOffset = 0;
    const distanceFromTop = 22 * diffInDays + 10;

    if (distanceFromTop > 400) {
      scrollOffset = distanceFromTop - 300;
    } else {
      scrollOffset = 0;
    }

    scrollRef.current.scroll({
      top: scrollOffset,
      behavior: 'smooth',
    });

    scrubRef.current.style.top = distanceFromTop + 'px';
  }, [closestDate]);

  return (
    <div ref={scrollRef} className={styles.timeline}>
      {weeks}
      <div ref={scrubRef} className={styles.scrubber}></div>
    </div>
  );
};

export default Timeline;
