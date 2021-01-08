import { Person } from "./logic/Person";
import { Simulation } from "./logic/Simulation";
import { isSimulationSerialization, revive } from "./logic/simulationSerialization"

const maxSimulationRuns = 100000000;
const graphicsUpdateInterval = 100000;
let exactnesThreshold = 0.0001;
let resolution = 0.1;
let lastArray: {
    date: Date;
    values: number[];
}[] | null = null;


function isConfig(data: any): data is { resolution: number , accuracy:number} {
    if (data.resolution) {
        return true;
    }
    return false;
}
onmessage = (ev) => {
    if (isSimulationSerialization(ev.data)) {
        const simulation = revive(ev.data);
        const results: {
            probability: number;
            result: Map<Person, Date>;
        }[] = [];
        for (let i = 1; i < maxSimulationRuns; i++) {
            results.push(simulation.simulateOnce());
            if (i % graphicsUpdateInterval == 0) {
                const processed = simulation.processSimulationResults(results);
                const array = Simulation.toArray(processed, resolution, simulation.lastDate.getTime());
                const message = {
                    array: array,
                    persons: simulation.personArray.map(person => person.name)
                }
                const ctx: Worker = self as any;
                ctx.postMessage(message);
                if (lastArray) {
                    //check for difference and break if small enough
                    let difference = 0;
                    for (let i = 0; i < lastArray.length; i++) {
                        const datapoint = array[i];
                        const lastDatapoint = lastArray[i];
                        for (let j = 0; j < datapoint.values.length; j++) {
                            difference += Math.abs(datapoint.values[j] - lastDatapoint.values[j]);
                        }
                    }
                    difference /= lastArray.length * lastArray[0].values.length;
                    console.log(difference);
                    if (difference < exactnesThreshold) {
                        return;
                    }
                }
                lastArray = array;
            }
        }
    }else if(isConfig(ev.data)){
        resolution=ev.data.resolution;
        exactnesThreshold=ev.data.accuracy;
    }
}