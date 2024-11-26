import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

type FieldRule = {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  regex?: RegExp;
};

type CriteriaFieldsRule = {
  property: string;
  rule: FieldRule;
};

export type CriteriaByEnum<T extends string | number | symbol> = {
  [key in T]: CriteriaFieldsRule[];
};

@ValidatorConstraint({ name: 'ValidateDerivedFields', async: false })
class DerivedFieldValidator<T extends string | number | symbol>
  implements ValidatorConstraintInterface
{
  constructor(private criteriaByEnum: CriteriaByEnum<T>) {}

  // here value is derived field which is object
  validate(value: any, args?: ValidationArguments) {
    const relatedValue = (args.object as any)[args.constraints[0]]; // source field
    const criterias = this.criteriaByEnum[relatedValue as T]; // fetches criteria based on the related field value

    if (!criterias) {
      return true;
    } // skip where no criteria is specified

    let isValid = false;
    // validate for all the required fields first
    isValid = this.hasAllRequiredFields(value, criterias);

    if (!isValid) return isValid;

    isValid = this.validateFieldByRules(value, criterias);

    return isValid;
  }

  hasAllRequiredFields(value: any, criterias: CriteriaByEnum<T>[T]): boolean {
    const providedFields = Object.keys(value);
    const requiredFields = criterias
      ?.filter((el) => el.rule.required)
      .map((el) => el.property);

    return requiredFields.every((el) => providedFields.indexOf(el) > -1);
  }

  validateFieldByRules(values: any, criterias: CriteriaByEnum<T>[T]): boolean {
    let isValid = true;
    const fieldRuleMap: { [key: string]: FieldRule } = {};

    criterias.forEach((criteria) => {
      fieldRuleMap[criteria.property] = criteria.rule;
    });

    const providedFields = Object.keys(values);
    isValid = providedFields.every((field) => {
      let isValidField = true;
      if (fieldRuleMap[field]) {
        // validate each rule for fields
        // no need to match required as we have checked already
        const { minLength, maxLength, regex } = fieldRuleMap[field];

        isValidField = this.validateMaxLength(field, values[field], maxLength);
        if (!isValidField) return isValidField;

        isValidField = this.validateMinLength(field, values[field], minLength);
        if (!isValidField) return isValidField;

        isValidField = this.validateRegExp(field, values[field], regex);
      }
      return isValidField;
    });
    return isValid;
  }

  validateMaxLength(field: string, v: any, maxLength?: number) {
    if (!maxLength) return true; // skip if no maxLength rule

    if (String(v).length > maxLength) {
      console.debug(
        `Field Rule maxLength for ${field} is violated received maxLength: ${String(v).length}`,
      );
      return false;
    }
    return true;
  }

  validateMinLength(field: string, v: any, minLength?: number) {
    if (!minLength) return true; // skip if no minLength rule

    if (String(v).length < minLength) {
      console.debug(
        `Field Rule minLength for ${field} is violated received minLength: ${String(v).length}`,
      );
      return false;
    }
    return true;
  }

  validateRegExp(field: string, v: any, regex: RegExp): boolean {
    if (!regex) return true;
    const isValidVal = regex.test(v);

    if (!isValidVal) {
      console.debug(`Field Rule regex for ${field} is violated`);
    }
    return isValidVal;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedField] = args.constraints;
    const relatedFieldValue = (args.object as any)[relatedField];

    return `${relatedField}:${relatedFieldValue} has invalid value in ${args.property}`;
  }
}

export function ValidateDerivedFieldBasedOnEnum<
  T extends string | number | symbol,
>(
  property: string,
  criteriaByEnum: CriteriaByEnum<T>,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: new DerivedFieldValidator(criteriaByEnum),
    });
  };
}
