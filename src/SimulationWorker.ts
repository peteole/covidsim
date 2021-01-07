import { Person } from "./logic/Person";
import { Simulation } from "./logic/Simulation";
import { isSimulationSerialization, serializeSimulation, revive } from "./logic/simulationSerialization"

const maxSimulationRuns = 100000000;
const graphicsUpdateInterval = 10000;
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
                const array = Simulation.toArray(processed, 0.1, simulation.lastDate.getTime());
                const message = {
                    array: array,
                    persons: simulation.personArray.map(person=>person.name)
                }
                const ctx: Worker = self as any;
                ctx.postMessage(message);
            }
        }
    }
}