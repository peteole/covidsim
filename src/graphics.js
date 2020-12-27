import pkg from 'nodeplotlib';
const { plot } = pkg;
import { algorithmicConstants } from "./constants.js";
import { Plot as VirusPlot } from "./Plot.js";
/**
 * 
 * @param {VirusPlot} virusPlot 
 */
export function visualize(virusPlot) {
    const persons=virusPlot.persons;
    const log=virusPlot.log;
    /**@type {import('nodeplotlib').Plot} */
    let plots = [];
    const x = [...Array(200).keys()].map((val) => val/10 );
    for (let person of persons) {
        const personLog = log.get(person);
        plots.push({
            x: x,
            y: x.map((x) => {
                return personLog.getInfectionProbability(new Date(virusPlot.initialDate.getTime() + x * algorithmicConstants.dayToMS));
            }),
            type: "scatter",
            name: person.name
        });
    }
    const tickvals=[... Array(20).keys()]
    
    /**@type {import('nodeplotlib').Layout} */
    const layout={
        xaxis:{
            tickmode: "array",
            tickvals: tickvals,
            ticktext: tickvals.map((x)=>new Date(virusPlot.initialDate.getTime() + x * algorithmicConstants.dayToMS).toISOString())
        }
    }
    plot(plots,layout);
}