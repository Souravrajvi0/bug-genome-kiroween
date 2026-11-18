import type { Bug } from '@/lib/domain/types';
import { HARBOR, LUMEN, PIGEON } from './projects';
import { code } from './snippet';

export const BUG_10: Bug = {
  id: 'bug-10',
  title: 'Success toast appears twice',
  description:
    'After saving a form a few times, the success toast shows two, then three times. Each re-render adds another listener for the saved event.',
  symptoms: ['Toast repeats more each time the form re-renders', 'Handler count grows over time', 'The save request itself runs once'],
  suspectedRootCause:
    'The effect adds an event listener on every render and never removes the previous one.',
  fixSummary:
    'Names the handler, removes it in the effect cleanup and limits the effect to one run. Only one listener exists at a time, which addresses the missing removal.',
  familyId: 'fam-listener',
  language: 'JavaScript',
  project: HARBOR,
  buggy: code(8, `
function FormView(props) {
  const [state, setState] = useState('idle');
  useEffect(() => {
    bus.on('saved', () => showToast('Saved'));
  });
  return render(props, state, setState);
}
`),
  fixed: code(8, `
function FormView(props) {
  const [state, setState] = useState('idle');
  useEffect(() => {
    const onSaved = () => showToast('Saved');
    bus.on('saved', onSaved);
    return () => bus.off('saved', onSaved);
  }, []);
  return render(props, state, setState);
}
`),
  isMock: true,
};

export const BUG_11: Bug = {
  id: 'bug-11',
  title: 'Scroll handler added on every render',
  description:
    'A sticky bar component adds a scroll listener each time it renders. Scrolling gets slower the longer the page is used.',
  symptoms: ['Scroll jank grows over time', 'Many handler calls per scroll event', 'Memory use climbs on long sessions'],
  suspectedRootCause:
    'The effect registers an anonymous scroll listener on every render and has no cleanup.',
  fixSummary:
    'Registers one named listener, removes it in the cleanup and runs the effect once. The listener count stays at one, which addresses the missing cleanup.',
  familyId: 'fam-listener',
  language: 'TypeScript',
  project: LUMEN,
  buggy: code(120, `
function StickyBar() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.addEventListener('scroll', () => {
      ref.current?.classList.toggle('stuck', window.scrollY > 80);
    });
  });
  return <div ref={ref} className="bar" />;
}
`),
  fixed: code(120, `
function StickyBar() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => {
      ref.current?.classList.toggle('stuck', window.scrollY > 80);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div ref={ref} className="bar" />;
}
`),
  isMock: true,
};

export const BUG_12: Bug = {
  id: 'bug-12',
  title: 'Event hook registered again on reconnect',
  description:
    'Every time the client reconnects, the message handler is added again, so each message is handled once more after every reconnect.',
  symptoms: ['Messages handled twice after one reconnect, three times after two', 'Counters drift upward', 'Only after network interruptions'],
  suspectedRootCause:
    'The connect function adds the message handler each time it runs, and the event emitter outlives the socket.',
  fixSummary:
    'Removes any existing handler before adding it. Repeated connects leave exactly one handler, which addresses the repeated registration.',
  familyId: 'fam-listener',
  language: 'JavaScript',
  project: PIGEON,
  buggy: code(71, `
function connect(client) {
  client.socket = openSocket(client.url);
  client.socket.on('open', () => {
    client.events.on('message', handleMessage);
    client.ready = true;
  });
}
`),
  fixed: code(71, `
function connect(client) {
  client.socket = openSocket(client.url);
  client.socket.on('open', () => {
    client.events.off('message', handleMessage);
    client.events.on('message', handleMessage);
    client.ready = true;
  });
}
`),
  isMock: true,
};