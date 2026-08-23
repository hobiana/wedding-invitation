import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InvitationService } from './invitation.service';
import { THROTTLE_INVITATION } from '../config/throttle.config';
import { SubmitRsvpDto } from './dto/submit-rsvp.dto';

// Intentionally NOT guarded: the nanoid linkId itself is the access key for
// unauthenticated guests. This is the app's only public endpoint.
//
// Being public, it needs a rate limit — the linkId is a credential and this is
// where someone would try to guess one. But it is also where a real guest
// shows up, often sharing an IP with the rest of their household behind a home
// router or a carrier NAT, so the limit is deliberately far looser than the
// admin default: cutting off an actual invitee is the worse failure.
@Throttle({ default: THROTTLE_INVITATION })
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
