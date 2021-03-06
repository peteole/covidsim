import { Virus } from "./Virus";
import { Person } from "./Person";
import { algorithmicConstants } from "./constants";

export class Observation {
    person: Person;
    /**
     * 
     * @param {Person} person 
     */
    constructor(person: Person) {
        this.person = person;
    }
    /**
     * 
     * @param {Date?} dateOfInfection - date at which an infection occurs or null when it does not occur
     * @returns {number} probability that this observation occurs given an invection
     */
    getProbability(dateOfInfection: Date | null): number {
        return -1;
    }
}
/**
 * @typedef {Object} TestOptions
 * @property {number} sensitivity
 * @property {number} specificity
 * @property {number} timeT
 */

/**
 * @class
 */
export class Test extends Observation {
    startObservability: number;
    endObservability: number;
    positive: boolean;
    sensitivity: number;
    specificity: number;
    date: Date;
    relevantTimeStart: Date;
    relevantTimeEnd: Date;
    /**
     * @param {Person} person
     * @param {Date} date - date of the test
     * @param {boolean} positive - true if the result is positive
     */
    constructor(person: Person, date: Date, positive: boolean, sensitivity = 0.95, specificity = 0.9, startObservability = 2, endObservability = 14) {
        super(person);
        this.setDate(date);
        this.startObservability = startObservability;
        this.endObservability = endObservability;
        this.positive = positive;
        this.sensitivity = sensitivity;
        this.specificity = specificity;
    }
    setDate(date = this.date) {
        this.date = date;
        this.relevantTimeStart = new Date(date);
        this.relevantTimeStart.setDate(date.getDate() - this.endObservability);
        this.relevantTimeEnd = new Date(date);
        this.relevantTimeEnd.setDate(date.getDate() - this.startObservability);
    }
    /**
     * 
     * @param {Date?} dateOfInfection - date at which an infection occurs or null when it does not occur
     * @returns {number} probability that this observation occurs given an invection
     */
    getProbability(dateOfInfection: Date | null): number {
        if (dateOfInfection && dateOfInfection > this.relevantTimeStart && dateOfInfection < this.relevantTimeEnd) {
            //infected
            return this.positive ? this.sensitivity : 1 - this.specificity;
        }
        //not infected
        return this.positive ? (1 - this.specificity) : this.sensitivity;
    }
}
/**
 * A log of the symptoms a person has. Note that a log MUST contain ALL logs about one person!
 */
export class SymptomLog extends Observation {
    log: Map<Date, number>;
    dates: Date[];
    minDate: Date;
    maxDate: Date;
    /**
     * @param {Person} person
     * @param {Map<Date,number>} log - maps dates strength of covid-specific symptoms of the person at that date. ONLY ONE REPORT PER DAY ALLOWED!!!
     */
    constructor(person: Person, log: Map<Date, number>) {
        super(person);
        this.log = log;
        /**@type {Date[]} */
        this.dates = new Array(...this.log.keys());
        this.dates.sort();
        this.minDate = this.dates[0];
        this.maxDate = this.dates[this.dates.length - 1];
    }
    /**
     * 
     * @param {Date?} dateOfInfection - date at which an infection occurs or null when it does not occur
     * @returns {number} probability that this observation occurs given an invection
     */
    getProbability(dateOfInfection: Date | null): number {
        let virusReportRate = 0;
        let infectionMatching = Virus.noSymptomProbability; //how much the infection matches with the report days
        if (dateOfInfection) {
            //infected
            const firstRelevantDay = new Date(dateOfInfection.getTime() + Virus.incubationTime * algorithmicConstants.dayToMS);
            const lastRelevantDay = new Date(dateOfInfection.getTime() + Virus.endOfInfectiosness * algorithmicConstants.dayToMS);
            const relevantReportDays = this.dates.filter((date) => firstRelevantDay <= date && date <= lastRelevantDay);//reports in infection timeframe
            for (let relevantReportDay of relevantReportDays) {
                infectionMatching = 1 - (1 - infectionMatching) * (1 - this.log.get(relevantReportDay) / relevantReportDays.length);
            }
            infectionMatching = relevantReportDays.length / Virus.endOfInfectiosness;
        }
        //not infected
        let averageIllness = 0;
        for (let dayLog of this.log) {
            averageIllness += dayLog[1];
        }
        averageIllness /= this.log.size;
        return virusReportRate * infectionMatching + (1 - virusReportRate) * (0.9 - 0.8 * averageIllness); //0.9 if no symptoms, 0.1 if total symptoms
    }
}