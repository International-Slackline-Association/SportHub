import {
  getAthleteContests,
  getAthleteWorldRecords,
  getAthleteWorldFirsts,
} from "@lib/data-services";
import { getAthleteProfile } from "@lib/user-query-service";

export async function getAthletePageData(athleteId: string) {
  try {
    // Fetch profile, contests, records, and firsts in parallel
    const [profile, contests, worldRecords, worldFirsts] = await Promise.all([
      getAthleteProfile(athleteId),
      getAthleteContests(athleteId),
      getAthleteWorldRecords(athleteId),
      getAthleteWorldFirsts(athleteId),
    ]);
    
    if (!athleteId) {
      console.error("Athlete ID is required");
      return {
        success: false,
        error: "Athlete ID is required",
      };
    }

    if (!profile) {
      console.error("No profile found for athlete", athleteId);
      return {
        success: true,
        error: "No profile found for athlete",
      };
    }

    return {
      success: true,
      profile,
      contests,
      worldRecords,
      worldFirsts,
    };
  } catch (error) {
    console.error('Error fetching athlete data:', error);
    return {
      success: false,
      error: `Error fetching athlete data: ${error}`,
    };
  }
};
