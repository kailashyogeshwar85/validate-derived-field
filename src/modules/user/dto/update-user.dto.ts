import { IsEnum, IsString } from 'class-validator';
import { ValidateDerivedFieldBasedOnEnum } from 'src/common/validators/validate-derived-fields.validator';

export enum DocType {
  PAN = 'PAN',
  ADDRESS_PROOF = 'ADDRESS_PROOF',
}

export class UpdateUserDto {
  @IsString()
  userId: string;

  @IsEnum(DocType, { each: true })
  docType: DocType; // source field

  @ValidateDerivedFieldBasedOnEnum('docType', {
    [DocType.PAN]: [
      {
        property: 'panNo',
        rule: { required: true, minLength: 10, maxLength: 10 },
      },
    ],
    [DocType.ADDRESS_PROOF]: [
      { property: 'address1', rule: { required: true, maxLength: 200 } },
      { property: 'city', rule: { required: true, maxLength: 50 } },
      { property: 'state', rule: { required: true, maxLength: 50 } },
      {
        property: 'pincode',
        rule: { required: true, regex: new RegExp('\\d{6}') },
      },
    ],
    // add more rules as per your requirements.
  })
  fields: object;
}
