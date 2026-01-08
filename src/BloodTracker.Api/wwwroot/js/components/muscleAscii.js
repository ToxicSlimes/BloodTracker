const muscleAscii = {
    chest: {
        label: 'Грудь',
        art: `   .-''''-.
  /        \\
 |  .-''-.  |
 | /  ||  \\ |
 | |  ||  | |
 | \\  ||  / |
 |  '-..-'  |
  \\        /
   '-.__.-'`
    },
    back: {
        label: 'Спина',
        art: `   .-''''-.
  /  /\\\\  \\
 |  / || \\  |
 | /  ||  \\ |
 | \\  ||  / |
 |  \\ || /  |
  \\  \\//  /
   '-.__.-'`
    },
    legs: {
        label: 'Ноги',
        art: `    ||  ||
    ||  ||
    ||  ||
    ||  ||
   / |  | \\
  /  |  |  \\
 /___|__|___\\`
    },
    shoulders: {
        label: 'Плечи',
        art: `    __.--.__
  .'  .--.  '.
 /   /    \\   \\
|   |      |   |
|   |      |   |
 \\   \\__/   /`
    },
    arms: {
        label: 'Руки',
        art: `  _.-'  '-._
 /  .----.  \\
|  |      |  |
|  |      |  |
 \\  '----'  /
  '-.____.-'`
    },
    core: {
        label: 'Кор',
        art: `    .----.
   / .--. \\
  | |    | |
  | |    | |
  | |    | |
   \\ '--' /
    '----'`
    }
};

export function getMuscleGroup(key) {
    return muscleAscii[key] ?? muscleAscii.core;
}

export function renderMuscleAscii(key) {
    const group = getMuscleGroup(key);
    return `<span class="muscle-ascii-label">[ ${group.label.toUpperCase()} ]</span>\n` +
        `<span class="muscle-ascii-highlight">${group.art}</span>`;
}

export const muscleGroups = Object.keys(muscleAscii);
