import { Contact } from "./Contact";
import { Person } from "./Person";
import { Simulation } from "./Simulation";
import { Observation, Test } from "./Test";

interface TestSerialization {
    type: string;
    person: string;
    date: Date;
    positive: boolean;
    sensitivity: number;
    specificity: number;
    relevantTimeStart: Date;
    relevantTimeEnd: Date;
}
export class SimulationSerialization {
    persons: {
        name: string;
        untrackedFrequency: number;
        untrackedIntensity: number;
        activityString: string;
    }[];
    contacts: {
        a: string;
        b: string;
        date: Date;
        intensity: number;
    }[];
    tests: (TestSerialization | {
        type: string
    })[];
    initialDate: Date;
    lastDate: Date;
}

export function isTest(observation: Observation): observation is Test {
    return (observation as Test).date !== null;
}
export function isSimulationSerialization(serialization: any): serialization is SimulationSerialization {
    if(!serialization.persons)
        return false;
    const p = (serialization as SimulationSerialization).persons[0];
    if (p) {
        if (p.activityString)
            return true;
    }
    return false;
}
export function serializeSimulation(simulation: Simulation): SimulationSerialization {
    return {
        persons: simulation.personArray.map((person) => {
            return {
                name: person.name,
                untrackedFrequency: person.untrackedFrequency,
                untrackedIntensity: person.untrackedIntensity,
                activityString: person.externalActivity.toString()
            }
        }),
        contacts: simulation.contacts.map(contact => {
            return {
                a: contact.a.name,
                b: contact.b.name,
                date: contact.date,
                intensity: contact.intensity,
            };
        }),
        tests: simulation.observations.map((observation) => {
            if (isTest(observation)) {
                return {
                    type: "Test",
                    person: observation.person.name,
                    date: observation.date,
                    positive: observation.positive,
                    sensitivity: observation.sensitivity,
                    specificity: observation.specificity,
                    relevantTimeStart: observation.relevantTimeStart,
                    relevantTimeEnd: observation.relevantTimeEnd
                }
            } else {
                return {
                    type: "unknown"
                }
            }
        }),
        initialDate: simulation.initialDate,
        lastDate: simulation.lastDate
    }
}
function isTestSerialization(test: TestSerialization | { type: string }): test is TestSerialization {
    return test.type == "Test";
}
export function revive(serialization: SimulationSerialization) {
    const sim = new Simulation(serialization.initialDate);
    sim.lastDate = serialization.lastDate;
    for (let personSerialization of serialization.persons) {
        sim.addPerson(new Person(
            personSerialization.name,
            personSerialization.untrackedFrequency,
            personSerialization.untrackedIntensity,
            eval(personSerialization.activityString)
        ))
    }
    const personFromName = (name: string) => {
        for (let person of sim.persons)
            if (person.name == name) {
                return person;
            }
        return null;
    }
    for (let c of serialization.contacts) {
        sim.addContact(new Contact(
            personFromName(c.a),
            personFromName(c.b), {
            date: c.date,
            intensity: c.intensity
        }
        ))
    }
    for (let ob of serialization.tests) {
        if (isTestSerialization(ob)) {
            const toAdd = new Test(
                personFromName(ob.person),
                ob.date,
                ob.positive,
                ob.sensitivity,
                ob.specificity
            );
            toAdd.relevantTimeStart = ob.relevantTimeStart;
            toAdd.relevantTimeEnd = ob.relevantTimeEnd;
            sim.observations.push(toAdd);
        }
    }
    sim.refreshContacts();
    return sim;
}

const dateKeys = new Set(["date", "initialDate", "lastDate","relevantTimeStart","relevantTimeEnd"])
export function tryParseString(jsonString: string) {

    const parsed = JSON.parse(jsonString, (key, val) => {
        if (dateKeys.has(key))
            return new Date(val);
        return val
    });
    if (isSimulationSerialization(parsed)) {
        const simulation = revive(parsed);
        return simulation;
    }
    return null;
}