import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Globe, Users, Lock } from "lucide-react";

interface PrivacySelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PrivacySelector({ value, onChange, disabled }: PrivacySelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="privacy-selector">Privacy Level</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="privacy-selector">
          <SelectValue placeholder="Select privacy level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="public">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <div>
                <div className="font-medium">Public</div>
                <div className="text-xs text-muted-foreground">Everyone can see this list</div>
              </div>
            </div>
          </SelectItem>
          <SelectItem value="connections">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <div>
                <div className="font-medium">Connections</div>
                <div className="text-xs text-muted-foreground">Only your connections can see this list</div>
              </div>
            </div>
          </SelectItem>
          <SelectItem value="private">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <div>
                <div className="font-medium">Private</div>
                <div className="text-xs text-muted-foreground">Only you can see this list</div>
              </div>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}