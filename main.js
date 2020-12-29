import { Person } from "./src/Person.js";
import { Contact } from "./src/Contact.js";
import { Plot, PersonLog } from "./src/Plot.js";
import {visualize} from "./src/graphics.js";
import { Simulation } from "./src/Simulation.js";
import { SymptomLog, Test } from "./src/Test.js";
let a = new Person("A")//,(date)=>({contactDensity:date.getTime()<new Date("2020-11-1").getTime()?1:0,contactIntensity:1}));
let b = new Person("B")//,(date)=>({contactDensity:0,contactIntensity:0}));
let c = new Person("C");
let simulation = new Simulation(new Date("2020-10-27"));
simulation.addContact(new Contact(a, b, { intensity: 0.5, date: new Date("2020-11-2") }));
simulation.addContact(new Contact(a, c, { intensity: 0.2, date: new Date("2020-11-3") }));
simulation.addContact(new Contact(c, b, { intensity: 0.7, date: new Date("2020-11-6") }));
simulation.observations.push(new Test(a,new Date("2020-11-5"),true,0.95,0.9));
simulation.observations.push(new SymptomLog(a,new Map([
    [new Date("2020-10-22"),0],
    [new Date("2020-10-23"),0],
    [new Date("2020-10-24"),0.1],
    [new Date("2020-10-25"),0.4],
    [new Date("2020-10-26"),0.6],
    [new Date("2020-10-27"),0.8],
    [new Date("2020-10-27"),0.8],
    [new Date("2020-10-28"),0.8],
    [new Date("2020-10-29"),0.8],
    [new Date("2020-10-30"),0.7]
])))
const result=simulation.simulate(100000);
console.log(result.totalInfectionProbability);
result.initialDate.setDate(result.initialDate.getDate()-7);
visualize(result);