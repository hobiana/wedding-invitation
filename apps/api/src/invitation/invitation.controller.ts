import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { SubmitRsvpDto } from './dto/submit-rsvp.dto';

// Intentionally NOT guarded: the nanoid linkId itself is the access key for
// unauthenticated guests. This is the app's only public endpoint.
@Controller('invitation')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get(':linkId')
  get(@Param('linkId') linkId: string) {
    return this.invitationService.getInvitation(linkId);
  }

  @Patch(':linkId/rsvp')
  submitRsvp(@Param('linkId') linkId: string, @Body() dto: SubmitRsvpDto) {
    return this.invitationService.submitRsvp(linkId, dto);
  }
}
