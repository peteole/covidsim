

export class Virus {


    /** days after infection when you start being infectious */
    static startOfInfectiosness = 2;

    /** days after infection when you stop being infectious */
    static endOfInfectiosness = 10;
    /**days after first symptoms occur */
    static incubationTime = 5.5;
    /**probability of not having any symptoms with the virus */
    static noSymptomProbability = 0.55;
    /**
     * 
     * @param {PersonLog} log 
     * @param {Date} date - date to get probability from
     * @returns {number} - probability of being infected and able to spread the virus at that date
     */
    static getAcuteInfectionProbability(log: { getInfectionProbability: (arg0: Date) => number; }, date: Date) {
        const startInfectionPeriod = new Date(date); startInfectionPeriod.setDate(date.getDate() - Virus.endOfInfectiosness);
        const endInfectionPeriod = new Date(date); endInfectionPeriod.setDate(date.getDate() - Virus.startOfInfectiosness);
        return log.getInfectionProbability(endInfectionPeriod) - log.getInfectionProbability(startInfectionPeriod);
    }
    static getProbabilityOfInfectiousness(infectionDate:  Date, currentDate: Date) {
        const startInfectionPeriod = new Date(infectionDate); startInfectionPeriod.setDate(infectionDate.getDate() + Virus.startOfInfectiosness);
        const endInfectionPeriod = new Date(infectionDate); endInfectionPeriod.setDate(infectionDate.getDate() + Virus.endOfInfectiosness);
        return (startInfectionPeriod < currentDate && currentDate < endInfectionPeriod) ? 1 : 0;
    }
}
