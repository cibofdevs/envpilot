FROM jenkins/jenkins:lts-jdk17

# ALLOW_LOCAL_CHECKOUT: the demo repo is a local bare repo (file:// SCM url), which the
# git plugin blocks by default as a security hardening measure - safe to allow here since
# this Jenkins only ever talks to repos we seeded ourselves for local testing.
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false -Dhudson.plugins.git.GitSCM.ALLOW_LOCAL_CHECKOUT=true"
ENV CASC_JENKINS_CONFIG=/usr/share/jenkins/ref/casc_configs/jenkins.yaml

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli -f /usr/share/jenkins/ref/plugins.txt

COPY casc/jenkins.yaml /usr/share/jenkins/ref/casc_configs/jenkins.yaml

# The seeded demo repo (docker/jenkins/seed-demo-repo.sh) is created by a different
# container/UID than Jenkins runs as, which trips git's "dubious ownership" safety
# check when Git Parameter runs `git ls-remote` against it - trust the whole mount.
# Written to /etc/gitconfig (as root, outside the /var/jenkins_home volume) so it
# survives the runtime volume mount instead of being shadowed by it.
USER root
RUN git config --system --add safe.directory '/demo-repos/*'
USER jenkins
