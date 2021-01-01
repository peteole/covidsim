import pkg from 'nodeplotlib';
const { plot } = pkg;
import { algorithmicConstants } from "./logic/constants.js";
import { Simulation } from "./logic/Simulation.js";
import {Person}from "./Person.js";
/**
 * 
 * @param {{initialDate: Date,totalInfectionProbability: Map<Person, number>;infectionTimeline: Map<Person, {date: Date;p: number;pAcc: number | null; }[]>;}} simulationResult 
 */
export function visualize(simulationResult) {
    const persons=simulationResult.infectionTimeline.keys();
    const log=simulationResult.infectionTimeline;
    /**@type {import('nodeplotlib').Plot} */
    let plots = [];
    const x = [...Array(200).keys()].map((val) => val/10 );
    for (let person of persons) {
        const personLog = log.get(person);
        plots.push({
            x: x,
            y: x.map((x) => {
                const threshhold=new Date(simulationResult.initialDate.getTime() + x * algorithmicConstants.dayToMS);
                return personLog.find((entry)=>!entry.date||entry.date>threshhold).pAcc;
                //return personLog.getInfectionProbability(new Date(simulationResult.initialDate.getTime() + x * algorithmicConstants.dayToMS));
            }),
            type: "scatter",
            name: person.name
        });
    }
    const tickvals=[... Array(20).keys()];
    
    /**@type {import('nodeplotlib').Layout} */
    const layout={
        xaxis:{
            tickmode: "array",
            tickvals: tickvals,
            ticktext: tickvals.map((x)=>new Date(simulationResult.initialDate.getTime() + x * algorithmicConstants.dayToMS).toISOString())
        }
    }
    plot(plots,layout);
}