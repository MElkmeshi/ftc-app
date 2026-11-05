export function placeLabel(place: number, places: number): string {
    if (places === 1) {
        return 'Winner';
    }

    return ['1st place', '2nd place', '3rd place'][place - 1] ?? `Place ${place}`;
}
