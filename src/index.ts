import {run} from '@cycle/run';
import {makeDOMDriver, div, DOMSource, VNode} from '@cycle/dom';
import {timeDriver, TimeSource} from '@cycle/time';
import xs, {Stream} from 'xstream';

interface Sources {
  DOM: DOMSource;
  Time: TimeSource;
}

interface Sinks {
  DOM: Stream<VNode>
}

function main (sources: Sources): Sinks {
  console.log(sources);
  return {
    DOM: xs.of(div('hello world'))
  }
}

const drivers = {
  DOM: makeDOMDriver(document.body),
  Time: timeDriver
}

run(main, drivers);
