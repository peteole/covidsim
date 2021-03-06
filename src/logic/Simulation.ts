import { Person, UntrackedContact } from "./Person";
import { Contact } from "./Contact";
import { Virus } from "./Virus";
import { Observation, Test } from "./Test";
import { algorithmicConstants } from "./constants";

export function isUntracked(contact: UntrackedContact | Contact): contact is UntrackedContact {
    return (contact as UntrackedContact).person != null;
}
/**
 * Simulation of an infection. Provides the functionality to simulate the plot many times to approximate probabilities at given test results
 */
export class Simulation {
    observations: Observation[];
    initialDate: Date;
    lastDate: Date;
    persons: Set<Person>;
    contacts: Contact[];
    personToInitialInfectionDate: Map<Person, () => Date>;
    constructor(initialDate: Date = new Date(), observations: Observation[] = []) {
        this.observations = observations;
        this.initialDate = initialDate;
        this.lastDate = initialDate;
        /**@type {Set<Person>}*/
        this.persons = new Set();
        /** @type {Contact[]} */
        this.contacts = [];
        /**
         * Assigns a function to each person which generates an initial infection date (or null if no infection happened)
         * @type {Map<Person,()=>Date?}
         */
        this.personToInitialInfectionDate = new Map();
    }
    /**
     * 
     * @param {Person} person 
     * @param {()=>Date?} dateGenerator -function which generates an initial infection date (or null if no infection happened)
     */
    setInfectionDateFunction(person: Person, dateGenerator: () => Date | null) {
        this.personToInitialInfectionDate.set(person, dateGenerator);
    }
    /**@param {Person} toAdd */
    addPerson(toAdd: Person) {
        this.persons.add(toAdd);

        this.personToInitialInfectionDate.set(toAdd, () => {
            if (Math.random() < 0.01) {
                return new Date(this.initialDate.getTime() - Math.random() * 100 * algorithmicConstants.dayToMS);//random day in the last 100 days
            }
            return null;
        });
    }
    /** @param {Contact} toAdd - contact to be added to the procession list */
    addContact(toAdd: Contact) {
        for (let i = 0; i < this.contacts.length; i++) {
            if (toAdd.date.getTime() < this.contacts[i].date.getTime()) {
                this.contacts.splice(i, 0, toAdd);
                this.persons.add(toAdd.a);
                this.persons.add(toAdd.b);
                return;
            }
        }
        this.contacts.push(toAdd);
        this.addPerson(toAdd.a);
        this.addPerson(toAdd.b);
        if (this.lastDate < toAdd.date)
            this.lastDate = toAdd.date;
    }
    /**order contacts to avoid any errors */
    refreshContacts() {
        this.contacts.sort((a, b) => a.date.getTime() - b.date.getTime());
        if (this.contacts.length > 0) {
            const newLastDate = this.contacts[this.contacts.length - 1].date;
            if(newLastDate>this.lastDate)
                this.lastDate=newLastDate;
        }
        for (let o of this.observations) {
            if (o instanceof Test && o.date && o.date > this.lastDate) {
                this.lastDate = o.date;
            }
        }
        if (this.contacts.length > 0 && this.initialDate > this.contacts[0].date) {
            this.initialDate = this.contacts[0].date;
        }
    }
    simulateOnce() {
        const lastDateToSimulate = this.lastDate;
        /**
         * @type {Map<Person,Date>}
         */
        const result: Map<Person, Date> = new Map();
        /**@type {UntrackedContact|Contact)[]} */
        const events: (UntrackedContact | Contact)[] = new Array(...this.contacts);
        /**@type {(contact:import("./Person.js").UntrackedContact)=>void} */
        const addUntrackedContact: (contact: UntrackedContact) => void = (constact): void => {
            const date = constact.date;
            for (let i in events) {
                if (events[i].date > date) {
                    events.splice(Number.parseInt(i), 0, constact);
                    return;
                }
            }
            events.push(constact);
        };
        for (let person of this.persons) {
            const initialDate = this.personToInitialInfectionDate.get(person)();
            result.set(person, initialDate);
            for (let contact = person.externalActivity(this.initialDate, person); contact.date < lastDateToSimulate; contact = person.externalActivity(contact.date, person)) {
                if (contact.acuteInfected)
                    addUntrackedContact(contact);
            }
        }
        for (let contact of events) {
            if (isUntracked(contact)) {
                //contact is untracked. This is only triggered if the other person is infected
                if (!result.get(contact.person) && Math.random() < contact.intensity) {
                    result.set(contact.person, contact.date);
                }
                continue;
            }
            //contact is tracked
            const aDate = result.get(contact.a);
            const bDate = result.get(contact.b);
            // if both or none is infected nothing happens
            if (aDate && bDate || !aDate && !bDate)
                continue;
            if (aDate) {
                const probabilityOfInfection = contact.intensity * Virus.getProbabilityOfInfectiousness(aDate, contact.date);
                if (Math.random() < probabilityOfInfection) {
                    result.set(contact.b, contact.date);
                }
            }
            if (bDate) {
                const probabilityOfInfection = contact.intensity * Virus.getProbabilityOfInfectiousness(bDate, contact.date);
                if (probabilityOfInfection <= 0)
                    continue;
                if (Math.random() < probabilityOfInfection) {
                    result.set(contact.a, contact.date);
                }
            }
        }
        let probability = 1;
        for (let observation of this.observations) {
            probability *= observation.getProbability(result.get(observation.person));
        }
        return {
            probability: probability,
            result: result
        };
    }
    processSimulationResults(results: { result: Map<Person, Date>; probability: number; }[]) {

        let probabilitySum = 0;
        for (let result of results)
            probabilitySum += result.probability;
        /**@type {Map<Person,number>} */
        const totalInfectionProbability: Map<Person, number> = new Map();
        for (let person of this.persons) {
            totalInfectionProbability.set(person, 0);
        }
        /**@type {Map<Person,{date:Date,p:number, pAcc:number?}[]>} */
        const infectionDates: Map<Person, { date: Date; p: number; pAcc: number | null; }[]> = new Map();
        for (let person of this.persons)
            infectionDates.set(person, []);
        for (let result of results) {
            const realProb = result.probability / probabilitySum;

            for (let person of this.persons) {
                if (result.result.get(person))
                    totalInfectionProbability.set(person, totalInfectionProbability.get(person) + realProb);
                infectionDates.get(person).push({ date: result.result.get(person), p: realProb, pAcc: null });
            }
        }
        for (let person of this.persons) {
            const infectionDatesPerson = infectionDates.get(person);
            infectionDatesPerson.sort((a, b) => {
                if (!a.date && !b.date)
                    return 0;
                if (!a.date)
                    return 1;
                if (!b.date)
                    return -1;
                return a.date.getTime() - b.date.getTime();
            });
            let accumulatedProb = 0;
            for (let date of infectionDatesPerson) {
                accumulatedProb += date.p;
                date.pAcc = accumulatedProb;
            }
        }

        return {
            initialDate: this.initialDate,
            totalInfectionProbability: totalInfectionProbability,
            infectionTimeline: infectionDates
        };
    }
    simulate(runs: number) {
        const results: { result: Map<Person, Date>; probability: number; }[] = [];
        for (let i = 0; i < runs; i++) {
            const result = this.simulateOnce();
            results.push(result);
        }
        return this.processSimulationResults(results);
    }

    /**
     * computes an array representation of the simulation results
     * @param result -simulation result object
     * @param resolution - number of datapoints to show per day
     * @param lastDate - last date to simulate in ms from 1970
     */
    static toArray(result: {
        initialDate: Date;
        totalInfectionProbability: Map<Person, number>;
        infectionTimeline: Map<Person, {
            date: Date;
            p: number;
            pAcc: number;
        }[]>;
    }, resolution: number, lastDate: number) {
        const personArray = new Array(...result.infectionTimeline.keys());
        const list: { date: Date, values: number[] }[] = []
        const indices = personArray.map((person) => 0);
        for (let date = result.initialDate; date.getTime() < lastDate; date = new Date(date.getTime() + resolution * 1000 * 60 * 60 * 24)) {
            const newValues = new Array(personArray.length);
            for (let i = 0; i < personArray.length; i++) {
                const person = personArray[i];
                const personValues = result.infectionTimeline.get(person);
                let index = indices[i];
                while (index + 1 < personValues.length && personValues[index + 1].date && personValues[index + 1].date < date)
                    index++;
                indices[i] = index;
                newValues[i] = personValues[index].pAcc;
            }
            list.push({ date: date, values: newValues });
        }
        return list;
    }



    /**returns the persons as array to be able to use Array.map etc */
    get personArray() {
        return new Array(...this.persons);
    }
}