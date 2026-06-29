export function fromApiPet(p = {}) {
  return {
    pet_id: p.pet_id,
    name: p.name || "",
    species: p.species || "DOG",
    breed: p.breed || "",
    gender: p.gender || "M",
    birthDate: p.birth_date || "",
    age: p.age ?? "",
    weightKg: p.weight_kg ?? "",
    heightCm: p.height_cm ?? "",
    circumference: p.circumference ?? "",
    legLength: p.leg_length ?? "",
    photo: p.photo_path || "",
  };
}

export function toApiPet(p = {}) {
  const number = (value) =>
    value === "" || value == null ? null : Number(value);
  return {
    name: p.name,
    species: p.species || null,
    breed: p.breed || null,
    gender: p.gender || null,
    birth_date: p.birthDate || null,
    age: number(p.age),
    weight_kg: number(p.weightKg),
    height_cm: number(p.heightCm),
    circumference: number(p.circumference),
    leg_length: number(p.legLength),
  };
}

export function petAgeLabel(pet) {
  if (pet?.age !== "" && pet?.age != null) return `${pet.age}살`;
  if (!pet?.birthDate) return "";
  const birth = new Date(pet.birthDate);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() &&
      now.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? `${age}살` : "";
}
